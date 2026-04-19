from lib.prompts import POSTPARTUM_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class PostpartumAgent(BaseSpecialistAgent):
    agent_name = "PostpartumAgent"
    system_prompt = POSTPARTUM_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "postpartum" in member.conditions
