from lib.prompts import HYPERTENSION_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class HypertensionAgent(BaseSpecialistAgent):
    agent_name = "HypertensionAgent"
    system_prompt = HYPERTENSION_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "hypertension" in member.conditions
