from __future__ import annotations

import asyncio
import json
from typing import Any

import google.genai as genai
from google.genai import types as genai_types

from agents.specialists.base_agent import flash_model_name
from lib.gemini import make_gemini_client
from lib.gemini_quota import sleep_before_gemini_retry
from lib.prompts import GRADING_AGENT_SYSTEM


def _make_client() -> genai.Client:
    return make_gemini_client()


class GradingAgent:
    async def run(self, shopping: dict[str, Any], receipt_text: str, plan_id: str) -> dict[str, Any]:
        prompt = f"""
Plan ID: {plan_id}

NutriRx shopping list JSON:
{json.dumps(shopping, indent=2)}

Parsed receipt text (OCR):
{receipt_text}

Return the grading JSON object per your instructions.
"""

        def _call() -> dict[str, Any]:
            import logging

            logger = logging.getLogger(__name__)
            client = _make_client()
            full = f"{GRADING_AGENT_SYSTEM}\n\n{prompt}"
            max_attempts = 5
            for attempt in range(max_attempts):
                try:
                    response = client.models.generate_content(
                        model=flash_model_name(),
                        contents=full,
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json",
                        ),
                    )
                    text = response.text or "{}"
                    data = json.loads(text)
                    data["plan_id"] = plan_id
                    return data
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    logger.warning("GradingAgent attempt %s failed: %s", attempt + 1, e)
                    sleep_before_gemini_retry(e, attempt, max_attempts)
            raise RuntimeError("GradingAgent failed after retries")

        return await asyncio.to_thread(_call)
