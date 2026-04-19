from lib.prompts import DIABETES_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class DiabetesAgent(BaseSpecialistAgent):
    agent_name = "DiabetesAgent"
    system_prompt = DIABETES_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "diabetes" in member.conditions
