from lib.prompts import CHOLESTEROL_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class CholesterolAgent(BaseSpecialistAgent):
    agent_name = "CholesterolAgent"
    system_prompt = CHOLESTEROL_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "high_cholesterol" in member.conditions
