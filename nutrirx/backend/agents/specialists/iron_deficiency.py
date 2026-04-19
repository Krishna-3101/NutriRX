from lib.prompts import IRON_DEFICIENCY_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class IronDeficiencyAgent(BaseSpecialistAgent):
    agent_name = "IronDeficiencyAgent"
    system_prompt = IRON_DEFICIENCY_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "iron_deficiency" in member.conditions
