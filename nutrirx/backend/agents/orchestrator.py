from __future__ import annotations

import asyncio
import json
import os
from typing import Any, AsyncIterator

import google.genai as genai
from google.genai import types as genai_types

from agents.functions.budget import BudgetAgent
from agents.functions.cultural import CulturalAgent
from agents.specialists.cholesterol import CholesterolAgent
from agents.specialists.diabetes import DiabetesAgent
from agents.specialists.hypertension import HypertensionAgent
from agents.specialists.iron_deficiency import IronDeficiencyAgent
from agents.specialists.kidney_disease import KidneyDiseaseAgent
from agents.specialists.obesity import ObesityAgent
from agents.specialists.pediatric import PediatricAgent
from agents.specialists.postpartum import PostpartumAgent
from agents.specialists.prediabetes import PrediabetesAgent
from agents.specialists.pregnancy import PregnancyAgent
from lib.prompts import ORCHESTRATOR_SYSTEM
from lib.types import IntakeForm

ALL_SPECIALISTS: list[type] = [
    DiabetesAgent,
    HypertensionAgent,
    PregnancyAgent,
    PostpartumAgent,
    PediatricAgent,
    IronDeficiencyAgent,
    PrediabetesAgent,
    CholesterolAgent,
    ObesityAgent,
    KidneyDiseaseAgent,
]


def pro_model_name() -> str:
    return os.getenv("GEMINI_PRO_MODEL", "gemini-1.5-pro")


def _make_client() -> genai.Client:
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))


async def run_pipeline(intake: IntakeForm) -> AsyncIterator[dict[str, Any]]:
    active: list[tuple[Any, Any]] = []
    for SpecialistClass in ALL_SPECIALISTS:
        instance = SpecialistClass()
        for member in intake.household:
            if instance.is_applicable(member):
                active.append((instance, member))
                break

    yield {
        "agent": "Orchestrator",
        "status": "thinking",
        "message": f"Activating {len(active)} specialist agents for this household.",
    }

    specialist_results: list[dict[str, Any]] = []
    for agent, member in active:
        yield {
            "agent": agent.agent_name,
            "status": "thinking",
            "message": f"Analyzing {member.nickname}'s {', '.join(member.conditions)} profile...",
        }
        try:
            result = await agent.run(intake, member)
        except Exception as exc:  # noqa: BLE001
            result = {
                "clinical_priority": "Model error — using conservative defaults.",
                "nutrient_targets": {},
                "error": str(exc),
            }
        specialist_results.append(result)
        yield {
            "agent": agent.agent_name,
            "status": "done",
            "message": result.get("clinical_priority", "Targets computed."),
            "nutrients": result.get("nutrient_targets"),
        }

    yield {
        "agent": "Orchestrator",
        "status": "thinking",
        "message": "Running negotiation round — resolving conflicts between specialists...",
    }

    negotiation_prompt = f"""
Here are the outputs from {len(specialist_results)} specialist agents:
{json.dumps(specialist_results, indent=2, default=str)}

Household profile:
{json.dumps(intake.model_dump(mode="json", by_alias=True), indent=2)}
"""

    def _negotiate() -> dict[str, Any]:
        client = _make_client()
        full = f"{ORCHESTRATOR_SYSTEM}\n\n{negotiation_prompt}"
        response = client.models.generate_content(
            model=pro_model_name(),
            contents=full,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text or "{}")

    try:
        negotiation = await asyncio.to_thread(_negotiate)
    except Exception as exc:  # noqa: BLE001
        negotiation = {
            "conflicts_found": [],
            "merged_targets": {},
            "merged_preferred_foods": [],
            "merged_avoid_foods": [],
            "orchestrator_note": f"Negotiation error: {exc!s}",
        }

    for conflict in negotiation.get("conflicts_found") or []:
        if isinstance(conflict, dict):
            ctext = str(conflict.get("conflict", "Conflict"))[:100]
            winner = conflict.get("winner", "")
            yield {
                "agent": "Orchestrator",
                "status": "conflict",
                "message": f"Conflict: {ctext} → {winner} wins.",
            }

    yield {
        "agent": "Orchestrator",
        "status": "done",
        "message": negotiation.get(
            "orchestrator_note",
            "Targets merged. Handing to cultural and budget agents.",
        ),
    }

    merged = negotiation.get("merged_targets") or {}

    yield {
        "agent": "CulturalAgent",
        "status": "thinking",
        "message": f"Building {intake.cuisines} recipes that hit merged clinical targets...",
    }
    cultural = CulturalAgent()
    try:
        meal_plan = await cultural.run(intake, merged)
        yield {
            "agent": "CulturalAgent",
            "status": "done",
            "message": f"Generated {len(meal_plan)} culturally-authentic meals.",
        }
    except Exception as exc:  # noqa: BLE001
        meal_plan = []
        yield {
            "agent": "CulturalAgent",
            "status": "done",
            "message": f"Cultural agent error: {exc!s}",
        }

    yield {
        "agent": "BudgetAgent",
        "status": "thinking",
        "message": f"Sizing plan to ${intake.snap_weekly_budget}/week SNAP budget...",
    }
    budget = BudgetAgent()
    try:
        shopping = await budget.run(intake, meal_plan)
        total = float(shopping.get("total_estimated_cost", 0) or 0)
        yield {
            "agent": "BudgetAgent",
            "status": "done",
            "message": f"Shopping list built. Estimated total: ${total:.2f}",
        }
    except Exception as exc:  # noqa: BLE001
        shopping = {"categories": [], "total_estimated_cost": 0.0, "exceeds_snap_budget": False}
        yield {
            "agent": "BudgetAgent",
            "status": "done",
            "message": f"Budget agent error: {exc!s}",
        }

    yield {
        "agent": "Orchestrator",
        "status": "done",
        "message": "Plan complete. Generating your NutriRx.",
        "_plan_data": {
            "negotiation": negotiation,
            "meal_plan": meal_plan,
            "shopping": shopping,
        },
    }
