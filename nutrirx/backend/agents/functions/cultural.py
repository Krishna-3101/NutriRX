from __future__ import annotations

import asyncio
import json
from typing import Any

import google.genai as genai
from google.genai import types as genai_types

from agents.specialists.base_agent import flash_model_name
from lib.gemini import make_gemini_client
from lib.prompts import CULTURAL_AGENT_SYSTEM
from lib.types import IntakeForm


def _make_client() -> genai.Client:
    return make_gemini_client()


class CulturalAgent:
    async def run(self, intake: IntakeForm, merged_targets: dict[str, Any]) -> list[dict[str, Any]]:
        prompt = f"""
Cuisine preferences: {intake.cuisines}
Household: {[f"{m.nickname} (age {m.age}, {m.sex}, conditions: {m.conditions})" for m in intake.household]}
WIC eligible: {intake.wic_eligible}
SNAP budget: ${intake.snap_weekly_budget}/week

Merged clinical nutrient targets (daily, for the whole household):
{json.dumps(merged_targets, indent=2)}

Generate the 7-day meal plan as a JSON array of 28 meal objects.
"""

        def _call() -> list[dict[str, Any]]:
            client = _make_client()
            full = f"{CULTURAL_AGENT_SYSTEM}\n\n{prompt}"
            response = client.models.generate_content(
                model=flash_model_name(),
                contents=full,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=8192,
                ),
            )
            text = response.text or "[]"
            data = json.loads(text)
            if isinstance(data, dict) and "meals" in data:
                return list(data["meals"])
            if isinstance(data, list):
                return data
            return []

        return await asyncio.to_thread(_call)
