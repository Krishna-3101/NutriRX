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

Generate the meal plan as a JSON array of exactly 7 meal objects.
"""

        def _call() -> list[dict[str, Any]]:
            import time
            import logging
            logger = logging.getLogger(__name__)
            client = _make_client()
            full = f"{CULTURAL_AGENT_SYSTEM}\n\n{prompt}"
            
            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model=flash_model_name(),
                        contents=full,
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json",
                            max_output_tokens=8192,
                        ),
                    )
                    text = response.text or "[]"
                    
                    # Clean up the response text - sometimes it includes markdown backticks even with response_mime_type
                    text = text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    elif text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    text = text.strip()
                    
                    data = json.loads(text)
                    if isinstance(data, dict) and "meals" in data:
                        return list(data["meals"])
                    if isinstance(data, list):
                        return data
                    return []
                except Exception as e:
                    if attempt == 2:
                        raise
                    logger.warning(f"CulturalAgent attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(2)
            
            return []

        return await asyncio.to_thread(_call)
