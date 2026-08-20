import pytest
from adk_harness.gate import before_tool_callback

class FakeTool:
    def __init__(self, name):
        self.name = name

class FakeToolContext:
    def __init__(self, confirmation=None):
        self.tool_confirmation = confirmation
        self.requested = False
    
    def request_confirmation(self, hint, payload):
        self.requested = True

class FakeConfirmation:
    def __init__(self, approved):
        self.payload = {"approved": approved}

def call(tool_name, confirmation=None, **args):
    ctx = FakeToolContext(confirmation)
    res = before_tool_callback(FakeTool(tool_name), args, ctx)
    return res, ctx

def test_read_only_tool_is_allowed():
    res, ctx = call("read_file", path="test.txt")
    assert res is None
    assert not ctx.requested

@pytest.mark.parametrize("tool", ["write_file", "edit_file", "run_bash"])
def test_mutating_tool_requests_confirmation(tool):
    res, ctx = call(tool, path="test.txt")
    assert res is not None
    assert "Paused" in res.get("result", "")
    assert ctx.requested

def test_mutating_tool_approved_is_allowed():
    res, ctx = call("write_file", confirmation=FakeConfirmation(True), path="test.txt")
    assert res is None

def test_mutating_tool_refused_is_short_circuited():
    res, ctx = call("write_file", confirmation=FakeConfirmation(False), path="test.txt")
    assert res is not None
    assert "REFUSED" in res.get("result", "")
