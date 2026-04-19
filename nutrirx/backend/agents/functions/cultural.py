from __future__ import annotations

import asyncio
import json
from typing import Any

import google.genai as genai
from google.genai import types as genai_types

from agents.specialists.base_agent import flash_model_name
from lib.gemini import make_gemini_client
from lib.gemini_quota import sleep_before_gemini_retry
from lib.prompts import CULTURAL_AGENT_SYSTEM
from lib.types import IntakeForm


def _make_client() -> genai.Client:
    return make_gemini_client()


def _normalize_meal_list(items: list[Any]) -> list[dict[str, Any]]:
    """Accept flat meal arrays or per-day bundles `{ meals: [...] }` from the model."""
    out: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        nested = item.get("meals")
        if isinstance(nested, list):
            for m in nested:
                if isinstance(m, dict):
                    out.append(m)
            continue
        if item.get("name") or item.get("meal_type") or item.get("mealType"):
            out.append(item)
    return out


class CulturalAgent:
    async def run(self, intake: IntakeForm, merged_targets: dict[str, Any]) -> list[dict[str, Any]]:
        prompt = f"""
Cuisine preferences: {intake.cuisines}
Household: {[f"{m.nickname} (age {m.age}, {m.sex}, conditions: {m.conditions})" for m in intake.household]}
WIC eligible: {intake.wic_eligible}
SNAP budget: ${intake.snap_weekly_budget}/week

Merged clinical nutrient targets (daily, for the whole household):
{json.dumps(merged_targets, indent=2)}

Generate the meal plan as a JSON array of exactly 28 meal objects (7 days × 4 meal types), in order:
Mon breakfast, Mon lunch, Mon dinner, Mon snack, Tue breakfast, … through Sun snack.
Each object must include meal_type one of: breakfast, lunch, dinner, snack — four per calendar day.
"""

        def _call() -> list[dict[str, Any]]:
            import logging
            logger = logging.getLogger(__name__)
            client = _make_client()
            full = f"{CULTURAL_AGENT_SYSTEM}\n\n{prompt}"
            
            max_attempts = 5
            for attempt in range(max_attempts):
                try:
                    response = client.models.generate_content(
                        model=flash_model_name(),
                        contents=full,
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json",
                            max_output_tokens=32768,
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
                        return _normalize_meal_list(list(data["meals"]))
                    if isinstance(data, dict) and "days" in data:
                        days = data["days"]
                        if isinstance(days, list):
                            flat: list[dict[str, Any]] = []
                            for d in days:
                                if isinstance(d, dict) and isinstance(d.get("meals"), list):
                                    flat.extend(d["meals"])
                            if flat:
                                return _normalize_meal_list(flat)
                    if isinstance(data, list):
                        return _normalize_meal_list(data)
                    return []
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    logger.warning("CulturalAgent attempt %s failed: %s", attempt + 1, e)
                    sleep_before_gemini_retry(e, attempt, max_attempts)
            
            return []

        return await asyncio.to_thread(_call)
