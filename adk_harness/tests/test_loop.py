import pytest
from adk_harness.core.loop import _print_tool_calls

class FakeCall:
    def __init__(self, name, args):
        self.name = name
        self.args = args

class FakeEvent:
    def __init__(self, calls=[], responses=[]):
        self.calls = calls
        self.responses = responses
    def get_function_calls(self):
        return self.calls
    def get_function_responses(self):
        return self.responses

def test_print_tool_calls_ignores_confirmation(capsys):
    event = FakeEvent(calls=[FakeCall("adk_request_confirmation", {})])
    _print_tool_calls(event)
    captured = capsys.readouterr()
    assert "adk_request_confirmation" not in captured.out

def test_print_tool_calls_prints_normal_tools(capsys):
    event = FakeEvent(calls=[FakeCall("read_file", {"path": "test.txt"})])
    _print_tool_calls(event)
    captured = capsys.readouterr()
    assert "read_file" in captured.out
