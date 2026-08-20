"""The harness's native tools.

Exactly four, matching the irreducible set from ADK_HARNESS_REF.md
§ "Native Tool Budgets": read, write, edit, bash. Grep and glob are
deliberately absent — they are reachable through bash, and the reference
frames promoting them to dedicated tools as a real design fork rather than an
obvious improvement. README.md records which side this project takes and why.

Path enforcement is not here. It is in guardrails.py.
"""

from .read import read_file
from .write import write_file
from .edit import edit_file
from .bash import run_bash

# The order here is the order the model sees them in its tool list.
ALL_TOOLS = [read_file, write_file, edit_file, run_bash]

# The subset that changes state. The guardrails and the HITL gate both need to
# know which calls are consequential, and naming that once keeps the two
# layers from drifting apart.
MUTATING_TOOLS = {"write_file", "edit_file", "run_bash"}

__all__ = ["read_file", "write_file", "edit_file", "run_bash", "ALL_TOOLS", "MUTATING_TOOLS"]
