# ADK Harness

Unlike the other examples in this repository which rely on `adk run` or `adk web` to drive their execution, **`adk_harness/` is a self-owned agent loop**. It explicitly instantiates the `Runner` and `SessionService` primitives to manage the agent lifecycle itself.

This architecture enables deep interception of the execution flow, specifically demonstrating how to build **Categorical Guardrails** and **Human-In-The-Loop (HITL) Gates**.

## File Map to Harness Primitives

Every file in this project maps directly to a distinct responsibility that an agent harness must own:

- **`__main__.py` & `loop.py` (The Execution Loop)**: Replaces the `adk run` CLI. Drives the ADK `Runner.run_async` generator, intercepts `adk_request_confirmation` tool calls to pause execution, prompts the user via the REPL, and constructs `FunctionResponse` objects to resume the LLM natively.
- **`imports.py` (The ADK Surface)**: A centralized manifest of the specific Google ADK classes required to run a manual loop (e.g., `Runner`, `Session`, `ToolContext`), proving exactly how thin the necessary API surface is.
- **`session.py` (Persistence)**: Owns conversational memory across restarts using `DatabaseSessionService` (falling back to `InMemorySessionService`), a capability inherently required when driving your own loop.
- **`guardrails.py` (Categorical Defense)**: Uses `before_tool_callback` to silently intercept and deny dangerous tool executions (e.g., path traversal outside the workspace, denylisted bash commands) before they happen.
- **`gate.py` (Human-In-The-Loop)**: Uses `before_tool_callback` (chained after the guardrails) to pause safe, mutating operations (like writing files or running allowed bash commands), invoking `tool_context.request_confirmation()` to demand human approval via the REPL.
- **`agent.py` (The Brain)**: Configures the core `LlmAgent`, attaching the native tools and composing the callback chain (Guardrails → Gate).
- **`tools/` (Native Capabilities)**: Implements the six irreducible capabilities a filesystem agent needs: `read_file`, `write_file`, `edit_file`, `run_bash`, `grep_search`, and `glob_search`.
- **`paths.py` (The Sandbox)**: The shared path resolution logic ensuring the tools and the guardrails assess the exact same absolute canonical paths, closing TOCTOU loopholes.
- **`config.py`**: Centralizes environment variables and workspace boundaries.
- **`webapp/` (The UI Frontend & Proxy)**: A Next.js application integrated to drive the harness loop graphically (instead of the terminal REPL). It maps UI interactions to the backend streaming pipeline and includes a `/clear` API endpoint tied to the UI's 'Restart' button, which systematically resets the agent's workspace sandbox between testing sessions to ensure a clean slate.
