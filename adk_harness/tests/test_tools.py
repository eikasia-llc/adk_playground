"""Unit tests for the four native tools.

No LLM, no Runner — the tool functions are plain Python and are tested as
such. The failure paths matter more than the happy paths here: a tool that
silently does the wrong thing is worse for an agent than one that refuses.
"""

import os

import pytest

from adk_harness.config import WORKSPACE_DIR
from adk_harness.tools import read_file, write_file, edit_file, run_bash


@pytest.fixture(autouse=True)
def clean_workspace():
    """Empty the throwaway workspace between tests."""
    for entry in os.listdir(WORKSPACE_DIR):
        path = os.path.join(WORKSPACE_DIR, entry)
        if os.path.isfile(path) or os.path.islink(path):
            os.unlink(path)
        else:
            import shutil

            shutil.rmtree(path)
    yield


def _write(name: str, body: str) -> str:
    path = os.path.join(WORKSPACE_DIR, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(body)
    return path


# --- read_file ---------------------------------------------------------------


def test_read_returns_numbered_lines():
    _write("a.txt", "first\nsecond\n")
    out = read_file("a.txt")
    assert "   1\tfirst" in out
    assert "   2\tsecond" in out
    assert "2 lines" in out


def test_read_missing_file_explains_rather_than_raises():
    out = read_file("nope.txt")
    assert "no such file" in out.lower()


def test_read_directory_is_refused_with_a_hint():
    os.makedirs(os.path.join(WORKSPACE_DIR, "subdir"))
    out = read_file("subdir")
    assert "directory" in out.lower()


def test_read_empty_file_says_so():
    _write("empty.txt", "")
    assert "empty" in read_file("empty.txt").lower()


# --- write_file --------------------------------------------------------------


def test_write_creates_file_and_does_not_echo_content():
    body = "SENTINEL_CONTENT_SHOULD_NOT_APPEAR"
    out = write_file("new.txt", body)
    assert "Created" in out
    assert body not in out, "write_file must not echo content back into context"
    with open(os.path.join(WORKSPACE_DIR, "new.txt")) as fh:
        assert fh.read() == body


def test_write_reports_overwrite_distinctly():
    write_file("x.txt", "one")
    assert "Overwrote" in write_file("x.txt", "two")


def test_write_creates_parent_directories():
    write_file("deep/nested/f.txt", "hi")
    assert os.path.exists(os.path.join(WORKSPACE_DIR, "deep/nested/f.txt"))


# --- edit_file ---------------------------------------------------------------


def test_edit_replaces_unique_match():
    _write("c.py", "x = 1\ny = 2\n")
    out = edit_file("c.py", "x = 1", "x = 99")
    assert "1 replacement" in out
    with open(os.path.join(WORKSPACE_DIR, "c.py")) as fh:
        assert fh.read() == "x = 99\ny = 2\n"


def test_edit_refuses_ambiguous_match_rather_than_guessing():
    _write("d.py", "dup\ndup\n")
    out = edit_file("d.py", "dup", "changed")
    assert "appears 2 times" in out
    with open(os.path.join(WORKSPACE_DIR, "d.py")) as fh:
        assert fh.read() == "dup\ndup\n", "file must be untouched on ambiguity"


def test_edit_reports_missing_match():
    _write("e.py", "hello\n")
    assert "not found" in edit_file("e.py", "goodbye", "x").lower()


def test_edit_missing_file_points_at_write_file():
    assert "write_file" in edit_file("ghost.py", "a", "b")


def test_edit_rejects_noop_and_empty_old():
    _write("f.py", "same\n")
    assert "identical" in edit_file("f.py", "same", "same").lower()
    assert "empty" in edit_file("f.py", "", "x").lower()


# --- run_bash ----------------------------------------------------------------


def test_bash_runs_in_the_workspace():
    _write("marker.txt", "here")
    assert "marker.txt" in run_bash("ls")


def test_bash_returns_nonzero_status_as_a_string():
    out = run_bash("exit 3")
    assert "status 3" in out


def test_bash_combines_stderr():
    assert "oops" in run_bash("echo oops 1>&2")


def test_bash_reports_no_output_explicitly():
    assert "no output" in run_bash("true")


def test_bash_times_out_without_hanging():
    out = run_bash("sleep 30")
    assert "timed out" in out.lower()


def test_bash_rejects_empty_command():
    assert "empty" in run_bash("   ").lower()
