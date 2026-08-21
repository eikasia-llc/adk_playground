import os
from .loader import SKILLS_DIR

def read_skill(skill_name: str) -> str:
    """Read the instructions (SKILL.md) for a specific skill.

    Args:
        skill_name: The name of the skill directory (e.g. "time_management")
    """
    skill_file = SKILLS_DIR / skill_name / "SKILL.md"
    if not skill_file.exists():
        return f"Cannot read skill '{skill_name}': no such skill found."

    try:
        content = skill_file.read_text(encoding="utf-8", errors="replace")
        return f"--- SKILL: {skill_name} ---\n{content}"
    except OSError as exc:
        return f"Cannot read skill '{skill_name}': {exc}"
