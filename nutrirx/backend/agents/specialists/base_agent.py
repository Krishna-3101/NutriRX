from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import google.genai as genai
from google.genai import types as genai_types

from lib.gemini import make_gemini_client
from lib.gemini_quota import sleep_before_gemini_retry
from lib.types import HouseholdMember, IntakeForm


def flash_model_name() -> str:
    return os.getenv("GEMINI_FLASH_MODEL", "gemini-1.5-flash")


def _make_client() -> genai.Client:
    return make_gemini_client()


class BaseSpecialistAgent:
    system_prompt: str = ""
    agent_name: str = "BaseSpecialistAgent"

    async def run(self, intake: IntakeForm, relevant_member: HouseholdMember) -> dict[str, Any]:
        prompt = f"""
Household: {intake.household_size} members
Patient: {relevant_member.nickname}, age {relevant_member.age}, {relevant_member.sex}
Conditions: {", ".join(relevant_member.conditions)}
Lab values: A1C={relevant_member.a1c}, BP={relevant_member.systolic_bp}/{relevant_member.diastolic_bp}
SNAP budget: ${intake.snap_weekly_budget}/week
WIC: {"Yes" if intake.wic_eligible else "No"}
Cuisine: {intake.cuisines}

Generate your clinical nutrition targets for this patient.
"""

        def _call() -> dict[str, Any]:
            import logging

            logger = logging.getLogger(__name__)
            client = _make_client()
            full = f"{self.system_prompt}\n\n{prompt}"
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
                    return json.loads(text)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    logger.warning("%s attempt %s failed: %s", self.agent_name, attempt + 1, e)
                    sleep_before_gemini_retry(e, attempt, max_attempts)
            return {}

        return await asyncio.to_thread(_call)
