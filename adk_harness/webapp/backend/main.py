import os
import json
import time
import uuid
import re
import asyncio
from contextlib import asynccontextmanager, contextmanager
from agent.agent import session_queues

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types


# Stage-level latency instrumentation — see content/how-to/LLM_LATENCY_SKILL.md.
# Emits structured JSON with severity=NOTICE so Cloud Run parses it as a log
# entry above the project's "drop below NOTICE" cost-policy exclusion (see
# INFRASTRUCTURE_DEFINITIONS_REF.md). Locally the JSON line is still readable.
@contextmanager
def log_latency(stage: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(
            json.dumps({
                "severity": "NOTICE",
                "message": f"[LATENCY] {stage}: {elapsed_ms:.1f}ms",
            }),
            flush=True,
        )

load_dotenv()

# ---------------------------------------------------------------------------
# Lazy agent import — ADK requires GEMINI_API_KEY to be set before import
# ---------------------------------------------------------------------------
from agent import root_agent
from adk_harness.core.agent import reset_tool_call_cache

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
APP_NAME = "chatbot_template"
session_service = InMemorySessionService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Backend ready. root_agent:", root_agent.name)
    yield


app = FastAPI(title="ADK Chatbot Backend", lifespan=lifespan)

# CORS origins are read from ALLOWED_ORIGINS (comma-separated). In production
# the backend is deployed IAM-only and is reached exclusively via the Next.js
# server-side proxy in the frontend, which means no browser ever performs a
# cross-origin request against this service. ALLOWED_ORIGINS is therefore
# expected to be empty (or unset) in production. For local dev set
# ALLOWED_ORIGINS=http://localhost:3000 in backend/.env.
_allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_runner(session_id: str) -> Runner:
    return Runner(
        agent=root_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )


async def _ensure_session(session_id: str) -> None:
    """Create session if it doesn't already exist."""
    try:
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=session_id,
            session_id=session_id,
        )
    except Exception:
        pass  # session already exists


def _parse_response(text: str) -> dict:
    """Try to detect an A2UI JSON payload; fall back to plain text."""
    # Look for a JSON block anywhere in the text
    json_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if json_match:
        try:
            payload = json.loads(json_match.group(1))
            if "components" in payload:
                return {"type": "a2ui", "payload": payload}
        except json.JSONDecodeError:
            pass

    # Fallback: if there are no markdown fences, see if the whole thing is just JSON
    stripped = text.strip()
    if stripped.startswith("{"):
        try:
            payload = json.loads(stripped)
            if "components" in payload:
                return {"type": "a2ui", "payload": payload}
        except json.JSONDecodeError:
            pass
            
    return {"type": "text", "text": text}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None  # auto-generated if not provided


# ---------------------------------------------------------------------------
# POST /chat  — single-turn, returns full response as JSON
# ---------------------------------------------------------------------------

@app.post("/chat")
async def chat(body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    reset_tool_call_cache()

    with log_latency("ensure_session"):
        await _ensure_session(session_id)

    with log_latency("make_runner"):
        runner = _make_runner(session_id)

    content = types.Content(
        role="user",
        parts=[types.Part(text=body.message)],
    )

    response_text = ""
    tools_called = []
    with log_latency("chat:runner_run"):
        async for event in runner.run_async(
            user_id=session_id,
            session_id=session_id,
            new_message=content,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.function_call:
                        tools_called.append(part.function_call.name)

            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text or ""

    res = _parse_response(response_text)
    if tools_called:
        res["tools_called"] = tools_called

    return JSONResponse(
        content={"session_id": session_id, **res}
    )


# ---------------------------------------------------------------------------
# GET /stream  — streaming via Server-Sent Events (SSE)
# ---------------------------------------------------------------------------

@app.get("/stream")
async def stream(
    message: str = Query(..., description="User message"),
    session_id: str = Query(default=None, description="Session ID"),
):
    if not message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    session_id = session_id or str(uuid.uuid4())

    reset_tool_call_cache()

    with log_latency("ensure_session"):
        await _ensure_session(session_id)

    with log_latency("make_runner"):
        runner = _make_runner(session_id)

    content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    async def event_generator():
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
        stream_start = time.perf_counter()
        q = asyncio.Queue()
        q._loop = asyncio.get_running_loop()
        session_queues[session_id] = q

        async def run_runner():
            first_chunk_logged = False
            try:
                async for event in runner.run_async(
                    user_id=session_id,
                    session_id=session_id,
                    new_message=content,
                ):
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            # tool_call events are emitted by the agent's
                            # before_tool_callback, which fires for every tool
                            # invocation; emitting here too would duplicate them.
                            if part.text:
                                chunk = part.text
                                if chunk:
                                    if not first_chunk_logged:
                                        first_chunk_logged = True
                                        elapsed = (time.perf_counter() - stream_start) * 1000
                                        print(f"[LATENCY] stream:time_to_first_chunk: {elapsed:.1f}ms", flush=True)
                                    q.put_nowait(f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n")
                q.put_nowait(None)
            except Exception as e:
                q.put_nowait(e)

        task = asyncio.create_task(run_runner())

        try:
            while True:
                item = await q.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item

            yield "data: [DONE]\n\n"
            elapsed_total = (time.perf_counter() - stream_start) * 1000
            print(f"[LATENCY] stream:total: {elapsed_total:.1f}ms", flush=True)
        finally:
            session_queues.pop(session_id, None)
            task.cancel()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "agent": root_agent.name}

# ---------------------------------------------------------------------------
# POST /clear
# ---------------------------------------------------------------------------
import shutil
from adk_harness.core.config import WORKSPACE_DIR

@app.post("/clear")
def clear():
    if os.path.exists(WORKSPACE_DIR) and WORKSPACE_DIR.endswith("workspace"):
        for filename in os.listdir(WORKSPACE_DIR):
            file_path = os.path.join(WORKSPACE_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception:
                pass
    return {"status": "cleared"}
