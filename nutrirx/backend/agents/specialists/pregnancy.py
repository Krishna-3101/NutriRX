from lib.prompts import PREGNANCY_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class PregnancyAgent(BaseSpecialistAgent):
    agent_name = "PregnancyAgent"
    system_prompt = PREGNANCY_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "pregnancy" in member.conditions
