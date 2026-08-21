import os
import sys
import json

# Add the adk_playground root to sys.path so we can import adk_harness
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")))

from adk_harness.core.agent import INSTRUCTION as HARNESS_INSTRUCTION
from adk_harness.core.agent import combined_before_tool_callback, combined_after_tool_callback
from adk_harness.tools import ALL_TOOLS
from adk_harness.extensions.mcp.loader import get_mcp_toolsets
from adk_harness.extensions.skills.loader import load_skills_summary, get_skill_tools
from google.adk.agents.llm_agent import LlmAgent
from google.genai import types

session_queues = {}

def web_before_tool_callback(tool, args, tool_context):
    # 1. Harness Core Guardrails + Deduplication Cache
    result = combined_before_tool_callback(tool, args, tool_context)
    if result is not None:
        return result

    # 2. Stream to Frontend UI
    session_id = getattr(tool_context.session, "id", None) if tool_context and getattr(tool_context, "session", None) else None
    
    # Fallback for dev if session.id is not populated
    if not session_id and len(session_queues) == 1:
        session_id = list(session_queues.keys())[0]

    if session_id in session_queues:
        q = session_queues[session_id]
        payload = f"data: {json.dumps({'type': 'tool_call', 'tool': tool.name})}\n\n"
        if hasattr(q, "_loop"):
            q._loop.call_soon_threadsafe(q.put_nowait, payload)
        else:
            q.put_nowait(payload)
    return None

def web_after_tool_callback(tool, args, tool_context, tool_response):
    # 1. Harness Truncation Guardrail + Deduplication Cache
    final_response = combined_after_tool_callback(tool, args, tool_response, tool_context)

    # 2. Stream to Frontend UI
    session_id = getattr(tool_context.session, "id", None) if tool_context and getattr(tool_context, "session", None) else None
    
    if not session_id and len(session_queues) == 1:
        session_id = list(session_queues.keys())[0]

    if session_id in session_queues:
        q = session_queues[session_id]
        try:
            if isinstance(final_response, str):
                resp_str = final_response
            else:
                resp_str = json.dumps(final_response)
        except Exception:
            resp_str = str(final_response)

        payload = f"data: {json.dumps({'type': 'tool_response', 'tool': tool.name, 'output': resp_str})}\n\n"
        if hasattr(q, "_loop"):
            q._loop.call_soon_threadsafe(q.put_nowait, payload)
        else:
            q.put_nowait(payload)
    return final_response


WEB_INSTRUCTION = HARNESS_INSTRUCTION + load_skills_summary() + """

You are talking to the user through a rich Web Chat UI. Be conversational, helpful, and friendly. 
You can use your tools to explore the codebase, edit files, and run commands for the user.
Explain what you are doing before you run long commands.
"""

# Remove invalid generate_content_config

root_agent = LlmAgent(
    model="gemini-3.6-flash",
    name="web_harness_agent",
    description="A powerful coding agent equipped with filesystem tools.",
    instruction=WEB_INSTRUCTION,
    tools=ALL_TOOLS + get_mcp_toolsets() + get_skill_tools(),
    before_tool_callback=web_before_tool_callback,
    after_tool_callback=web_after_tool_callback,
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=False,
            maximum_remote_calls=3,
        ),
    ),
)
