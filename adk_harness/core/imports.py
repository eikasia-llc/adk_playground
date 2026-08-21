"""
Centralized imports for the adk_harness project.

Unlike the other projects in this playground, adk_harness does not run under
`adk run` / `adk web` — it drives the agent loop itself. That means it needs a
different slice of the ADK surface than tutorial_agent/ or mcp_tools/ do: the
Runner and the session services, which the CLI would otherwise own on our
behalf.

Verified against google-adk 1.27.0. Two things in this version are worth
knowing before you read the rest of the project:

  1. `ToolContext` IS `google.adk.agents.context.Context` — the same class,
     re-exported under two names, not a subclass. Tool functions and callbacks
     therefore receive the same object. Older ADK material describes a
     separate `CallbackContext`/`ToolContext` split; that split is gone here.

  2. `FunctionTool(func, require_confirmation=...)` carries HITL at the tool
     level, alongside `Context.request_confirmation(hint=, payload=)` for
     asking from inside a tool body. See guardrails.py for which we use and why.
"""

# --- Core Agent Types ---
# https://google.github.io/adk-docs/agents/
# LlmAgent binds a model, a system prompt, and a tool list into one agent.
# The `model=` parameter is what makes ADK model-agnostic.
from google.adk.agents.llm_agent import LlmAgent

# --- The Agent Loop ---
# Runner is the harness primitive proper: it sends prompts to the LLM,
# processes responses, and dispatches tool calls. Owning this explicitly —
# rather than letting the `adk` CLI own it — is the entire point of this
# project. See README.md § "Why this project does not use `adk run`".
#
# Signature (1.27.0):
#   Runner(*, app_name=..., agent=..., session_service=..., ...)
#   Runner.run_async(*, user_id, session_id, new_message=..., ...) -> AsyncGenerator[Event]
from google.adk.runners import Runner

# --- Session Lifecycle ---
# InMemorySessionService : state dies with the process. Fine for smoke tests.
# DatabaseSessionService : state survives a restart. Takes a SQLAlchemy URL
#                          (e.g. "sqlite:///./adk_harness/.harness_sessions.db").
# Session persistence is one of the things a minimal harness like Pi lacks.
from google.adk.sessions import (
    InMemorySessionService,
    DatabaseSessionService,
    Session,
)

# --- Native Tools ---
# FunctionTool wraps a plain Python function into a tool the model can call.
# These are the harness's *native* capabilities — the actions it performs in
# its own code, without calling any external service. adk_harness defines
# exactly four, matching Pi's irreducible budget: read, write, edit, bash.
#
# `require_confirmation` (bool or a predicate over the call args) makes the
# tool pause for human approval before it runs.
from google.adk.tools import FunctionTool

# Context is what both tool functions and lifecycle callbacks receive.
# `ToolContext` is an alias for it, kept here because tool signatures
# conventionally annotate with that name.
from google.adk.tools.tool_context import ToolContext
Context = ToolContext

# BaseTool is the type a before/after tool callback is handed as its first
# argument — needed to type the guardrails.
from google.adk.tools.base_tool import BaseTool

# --- Message Construction ---
# The Runner takes user turns as genai Content objects, not bare strings.
from google.genai import types

__all__ = [
    "LlmAgent",
    "Runner",
    "InMemorySessionService",
    "DatabaseSessionService",
    "Session",
    "FunctionTool",
    "Context",
    "ToolContext",
    "BaseTool",
    "types",
]
