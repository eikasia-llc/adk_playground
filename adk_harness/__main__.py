"""Entry point: `python -m adk_harness`.

Deliberately not `adk run adk_harness`. See loop.py and README.md.
"""

import sys

from .core.loop import main

if __name__ == "__main__":
    sys.exit(main())
