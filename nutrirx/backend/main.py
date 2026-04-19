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
from pydantic import BaseModel, ConfigDict, Field
from sse_starlette.sse import EventSourceResponse

from agents.functions.grading import GradingAgent
from agents.orchestrator import run_pipeline
from db.database import DB_PATH, init_db
from lib.gemini import user_facing_generation_error
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
    model_config = ConfigDict(populate_by_name=True)
    plan_id: str = Field(alias="planId")
    image_base64: str = Field(alias="imageBase64")


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

    grader = GradingAgent()
    grade = await grader.run(plan.get("shopping", {}), receipt_text, plan_id=request.plan_id)

    grade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO receipt_grades (id, plan_id, graded_at, data) VALUES (?,?,?,?)",
            (grade_id, request.plan_id, now, json.dumps(grade)),
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
    plans: list[dict] = []
    for row in rows:
        plan = json.loads(row[2])
        plans.append(
            {
                "id": row[0],
                "created_at": row[1],
                "summary": {
                    "total_meals": len(plan.get("meals", [])),
                    "estimated_cost": plan.get("shopping", {}).get("total_estimated_cost"),
                },
            }
        )
    return {"plans": plans}


@app.get("/health")
async def health():
    return {"status": "ok"}
