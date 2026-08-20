"""Point the harness at a throwaway workspace before anything imports config.

`config.WORKSPACE_DIR` is resolved once at import time, so the environment has
to be set before `adk_harness.config` is first imported — not in a fixture.
That is why this lives in conftest.py at module scope rather than in a
setUp-style hook.
"""

import os
import tempfile

_TMP_WORKSPACE = tempfile.mkdtemp(prefix="adk_harness_test_")
os.environ["HARNESS_WORKSPACE"] = _TMP_WORKSPACE
os.environ["HARNESS_BASH_TIMEOUT"] = "5"
