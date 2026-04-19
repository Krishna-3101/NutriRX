from lib.prompts import PREDIABETES_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class PrediabetesAgent(BaseSpecialistAgent):
    agent_name = "PrediabetesAgent"
    system_prompt = PREDIABETES_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "prediabetes" in member.conditions
