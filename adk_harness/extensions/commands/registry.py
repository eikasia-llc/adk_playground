import os
from pathlib import Path

COMMANDS_DIR = Path(__file__).parent

def load_commands() -> dict[str, str]:
    """Load dynamic slash commands from text files in the commands directory.
    
    If a file is named `ingest-receipts.txt`, typing `/ingest-receipts` in the REPL
    will substitute the contents of that file as the prompt.
    
    Returns:
        A dictionary mapping the slash command (e.g., '/ingest-receipts') to its prompt string.
    """
    commands = {}
    if not COMMANDS_DIR.exists():
        return commands
        
    for file in COMMANDS_DIR.iterdir():
        # Ignore python files and hidden files
        if file.suffix in (".txt", ".md", ".prompt") and not file.name.startswith("."):
            command_name = f"/{file.stem}"
            content = file.read_text(encoding="utf-8").strip()
            if content:
                commands[command_name] = content
                
    return commands
