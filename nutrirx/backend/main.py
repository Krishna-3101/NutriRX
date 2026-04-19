from __future__ import annotations

import base64
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sse_starlette.sse import EventSourceResponse

from agents.functions.grading import GradingAgent
from agents.orchestrator import run_pipeline
from db.database import DB_PATH, init_db
from lib.gemini import user_facing_generation_error
from lib.plan_nutrition import nutrition_avgs_from_plan
from lib.types import IntakeForm
from tools.unsplash import fetch_food_image
from tools.vision import ocr_receipt

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="NutriRx API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    intake: dict


class GradeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    plan_id: str
    image_base64: str


@app.post("/api/generate")
async def generate_plan(request: GenerateRequest):
    intake_obj = IntakeForm.from_dict(request.intake)
    intake_id = str(uuid.uuid4())
    plan_id = str(uuid.uuid4())

    async def event_generator():
        plan_data: dict | None = None
        try:
            async for update in run_pipeline(intake_obj):
                if "_plan_data" in update:
                    plan_data = update.pop("_plan_data")
                yield {"event": "agent_update", "data": json.dumps(update)}
        except Exception as exc:  # noqa: BLE001
            logger.exception("Plan generation failed for intake %s", intake_id)
            yield {
                "event": "complete",
                "data": json.dumps(
                    {
                        "plan_id": plan_id,
                        "error": user_facing_generation_error(exc),
                    }
                ),
            }
            return

        if not plan_data:
            yield {
                "event": "complete",
                "data": json.dumps(
                    {
                        "plan_id": plan_id,
                        "error": "Plan generation was interrupted before completion.",
                    }
                ),
            }
            return

        meals = plan_data["meal_plan"]
        for i, meal in enumerate(meals[:7]):
            url = await fetch_food_image(meal.get("image_query") or meal.get("name", ""))
            if url:
                meals[i]["image_url"] = url

        now = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO intakes (id, created_at, data) VALUES (?,?,?)",
                (intake_id, now, json.dumps(request.intake)),
            )
            plan_payload = {
                "id": plan_id,
                "generated_at": now,
                "intake_snapshot": request.intake,
                "negotiation": plan_data["negotiation"],
                "meals": meals,
                "shopping": plan_data["shopping"],
            }
            await db.execute(
                "INSERT INTO plans (id, intake_id, created_at, data) VALUES (?,?,?,?)",
                (plan_id, intake_id, now, json.dumps(plan_payload)),
            )
            await db.commit()

        yield {
            "event": "complete",
            "data": json.dumps({"plan_id": plan_id, "plan": plan_payload}),
        }

    return EventSourceResponse(event_generator())


@app.post("/api/grade-receipt")
async def grade_receipt(request: GradeRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT data FROM plans WHERE id=?", (request.plan_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")
        plan = json.loads(row[0])

    image_bytes = base64.b64decode(request.image_base64)
    receipt_text = await ocr_receipt(image_bytes)
    if not receipt_text or not receipt_text.strip():
        raise HTTPException(
            status_code=422,
            detail="We couldn't read that receipt. Try a clearer photo with better lighting.",
        )

    grader = GradingAgent()
    grade = await grader.run(plan.get("shopping", {}), receipt_text, plan_id=request.plan_id)

    grade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    gly, na, fe = nutrition_avgs_from_plan(plan)
    adherence = float(grade.get("adherence_score") or 0)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO receipt_grades (id, plan_id, graded_at, data) VALUES (?,?,?,?)",
            (grade_id, request.plan_id, now, json.dumps(grade)),
        )
        await db.execute("DELETE FROM week_history WHERE plan_id=?", (request.plan_id,))
        cur = await db.execute("SELECT COUNT(*) FROM week_history")
        week_number = int((await cur.fetchone())[0]) + 1
        hist_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO week_history (
                id, plan_id, week_number, adherence_score,
                avg_glycemic_load, avg_sodium_mg, avg_iron_mg, created_at
            ) VALUES (?,?,?,?,?,?,?,?)
            """,
            (hist_id, request.plan_id, week_number, adherence, gly, na, fe, now),
        )
        await db.commit()

    return {"grade_id": grade_id, "grade": grade}


@app.get("/api/history")
async def get_history(limit: int = 8):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id, created_at, data FROM plans ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        plan_ids = [r[0] for r in rows]
        adherence_map: dict[str, float] = {}
        if plan_ids:
            placeholders = ",".join("?" * len(plan_ids))
            gcur = await db.execute(
                f"""SELECT plan_id, data FROM receipt_grades
                    WHERE plan_id IN ({placeholders})
                    ORDER BY plan_id, graded_at DESC""",
                plan_ids,
            )
            for pid, raw in await gcur.fetchall():
                if pid in adherence_map:
                    continue
                gdata = json.loads(raw)
                raw_score = gdata.get("adherence_score")
                if raw_score is not None:
                    adherence_map[str(pid)] = float(raw_score)

    plans: list[dict] = []
    for row in rows:
        plan = json.loads(row[2])
        intake = plan.get("intake_snapshot") or {}
        household = intake.get("household") or []
        pid = str(row[0])
        adherence = adherence_map.get(pid)
        plans.append(
            {
                "id": row[0],
                "created_at": row[1],
                "summary": {
                    "total_meals": len(plan.get("meals", [])),
                    "estimated_cost": plan.get("shopping", {}).get("total_estimated_cost"),
                    "cuisines": intake.get("cuisines"),
                    "household_size": len(household) if isinstance(household, list) else 0,
                },
                "adherence_score": adherence,
                "intake_snapshot": intake,
            }
        )
    return {"plans": plans}


@app.get("/api/history/trends")
async def get_history_trends(limit: int = 12):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT week_number, adherence_score, avg_glycemic_load, avg_sodium_mg, avg_iron_mg, created_at
            FROM week_history
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cursor.fetchall()
    weeks = [
        {
            "week": int(r[0]),
            "adherence": float(r[1]) if r[1] is not None else None,
            "glycemic_load": float(r[2]) if r[2] is not None else None,
            "sodium_mg": float(r[3]) if r[3] is not None else None,
            "iron_mg": float(r[4]) if r[4] is not None else None,
            "created_at": r[5],
        }
        for r in rows
    ]
    return {"weeks": weeks}


@app.get("/api/plans/{plan_id}")
async def get_plan_by_id(plan_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT data FROM plans WHERE id=?", (plan_id,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return json.loads(row[0])


@app.get("/api/image")
async def proxy_food_image(query: str):
    """PRD-05: lazy-load meal images via Unsplash (returns null url if unset)."""
    url = await fetch_food_image(query)
    return {"url": url}


@app.get("/health")
async def health():
    return {"status": "ok"}
