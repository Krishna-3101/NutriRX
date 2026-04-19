from lib.prompts import OBESITY_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class ObesityAgent(BaseSpecialistAgent):
    agent_name = "ObesityAgent"
    system_prompt = OBESITY_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "obesity" in member.conditions
