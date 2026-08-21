import os
import re
from pathlib import Path

SKILLS_DIR = Path(__file__).parent

def get_skill_tools() -> list:
    """Return the list of tools associated with skills."""
    from .tool import read_skill
    return [read_skill]

def load_skills_summary() -> str:
    """Scan the skills directory and build a summary of available skills.
    
    Reads the YAML frontmatter of each SKILL.md file to extract the skill's
    name and description. This summary is injected into the agent's system prompt
    (progressive disclosure) so the agent knows what skills are available without
    loading their full content into the context window.
    
    Returns:
        A formatted string listing the available skills, or an empty string if none.
    """
    if not SKILLS_DIR.exists():
        return ""
        
    skills = []
    
    for skill_dir in SKILLS_DIR.iterdir():
        if not skill_dir.is_dir():
            continue
            
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
            
        try:
            content = skill_file.read_text(encoding="utf-8")
            # Extract frontmatter between the first two ---
            match = re.search(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL | re.MULTILINE)
            if not match:
                continue
                
            frontmatter = match.group(1)
            
            # Simple regex parsing for name and description (avoids PyYAML dependency)
            name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
            desc_match = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)
            
            if name_match and desc_match:
                name = name_match.group(1).strip()
                desc = desc_match.group(1).strip()
                skills.append(f"- **{name}** (Directory: `{skill_dir.name}`): {desc}")
                
        except Exception as e:
            print(f"Warning: Failed to load skill {skill_dir.name}: {e}")
            
    if not skills:
        return ""
        
    summary = "\nAvailable Skills (use the `read_skill` tool with the Directory name to load instructions):\n"
    summary += "\n".join(skills)
    return summary + "\n"
