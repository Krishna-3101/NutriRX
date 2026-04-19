from __future__ import annotations

import asyncio
import json
from typing import Any

import google.genai as genai
from google.genai import types as genai_types

from agents.specialists.base_agent import flash_model_name
from lib.gemini import make_gemini_client
from lib.prompts import BUDGET_AGENT_SYSTEM
from lib.types import IntakeForm


def _make_client() -> genai.Client:
    return make_gemini_client()


class BudgetAgent:
    async def run(self, intake: IntakeForm, meal_plan: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = f"""
Weekly SNAP budget: ${intake.snap_weekly_budget}
WIC eligible: {intake.wic_eligible}
Household size: {intake.household_size}

Meal plan JSON (all meals and ingredients):
{json.dumps(meal_plan, indent=2)}

Return a single JSON object with keys:
- "categories": array of {{ "category": "produce"|"protein"|"grains"|"dairy"|"pantry"|"frozen"|"beverages", "items": [...], "subtotal": number }}
- "total_estimated_cost": number
- "exceeds_snap_budget": boolean

Each shopping item: name, quantity, estimated_cost_usd, clinical_targets (strings), why_in_rx, is_wic_eligible, is_snap_eligible.
"""

        def _call() -> dict[str, Any]:
            import time
            import logging
            logger = logging.getLogger(__name__)
            client = _make_client()
            full = f"{BUDGET_AGENT_SYSTEM}\n\n{prompt}"
            
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
                    text = response.text or "{}"
                    
                    text = text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    elif text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    text = text.strip()

                    return json.loads(text)
                except Exception as e:
                    if attempt == 2:
                        raise
                    logger.warning(f"BudgetAgent attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(2)
            
            return {}

        return await asyncio.to_thread(_call)
