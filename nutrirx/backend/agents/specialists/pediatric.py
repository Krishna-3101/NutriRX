from lib.prompts import PEDIATRIC_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class PediatricAgent(BaseSpecialistAgent):
    agent_name = "PediatricAgent"
    system_prompt = PEDIATRIC_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return member.age < 18
