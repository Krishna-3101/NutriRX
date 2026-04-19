from lib.prompts import KIDNEY_DISEASE_SYSTEM
from lib.types import HouseholdMember

from .base_agent import BaseSpecialistAgent


class KidneyDiseaseAgent(BaseSpecialistAgent):
    agent_name = "KidneyDiseaseAgent"
    system_prompt = KIDNEY_DISEASE_SYSTEM

    def is_applicable(self, member: HouseholdMember) -> bool:
        return "kidney_disease" in member.conditions
