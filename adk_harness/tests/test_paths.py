import os
import pytest
from adk_harness.paths import resolve, is_inside_workspace, display
from adk_harness.config import WORKSPACE_DIR

def test_resolve_relative():
    res = resolve("test.txt")
    assert res == os.path.realpath(os.path.join(WORKSPACE_DIR, "test.txt"))

def test_resolve_absolute_stays_absolute():
    res = resolve("/etc/passwd")
    assert res == os.path.realpath("/etc/passwd")

def test_is_inside_workspace():
    assert is_inside_workspace(os.path.join(WORKSPACE_DIR, "file.txt"))
    assert not is_inside_workspace("/etc/passwd")

def test_display():
    resolved = os.path.join(WORKSPACE_DIR, "sub", "file.txt")
    # depending on OS, could use os.path.sep
    assert display(resolved) == os.path.join("sub", "file.txt")
