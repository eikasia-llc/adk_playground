import os
import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

load_dotenv()

# ---------------------------------------------------------------------------
# Lazy agent import — ADK requires GOOGLE_API_KEY to be set before import
# ---------------------------------------------------------------------------
from agent import root_agent

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

app.add_middleware(
    CORSMiddleware,
    # Tighten this to your frontend origin in production
    allow_origins=["http://localhost:3000"],
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
    await _ensure_session(session_id)

    runner = _make_runner(session_id)
    content = types.Content(
        role="user",
        parts=[types.Part(text=body.message)],
    )

    response_text = ""
    async for event in runner.run_async(
        user_id=session_id,
        session_id=session_id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            response_text = event.content.parts[0].text or ""

    return JSONResponse(
        content={"session_id": session_id, **_parse_response(response_text)}
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
    await _ensure_session(session_id)

    runner = _make_runner(session_id)
    content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    async def event_generator():
        # Send session_id as first event so the client can store it
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

        async for event in runner.run_async(
            user_id=session_id,
            session_id=session_id,
            new_message=content,
        ):
            if event.content and event.content.parts:
                chunk = event.content.parts[0].text or ""
                if chunk:
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "agent": root_agent.name}
