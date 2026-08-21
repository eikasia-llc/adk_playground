# ADK Harness

Unlike the other examples in this repository which rely on `adk run` or `adk web` to drive their execution, **`adk_harness/` is a self-owned agent loop**. It explicitly instantiates the `Runner` and `SessionService` primitives to manage the agent lifecycle itself.

This architecture enables deep interception of the execution flow and is structured into a layered architecture to support standard harness extensions (Skills, Hooks, Subagents, and MCP).

## Architecture

The harness is modularized into five main pillars to separate the generic loop engine from domain-specific capabilities, safety mechanics, and execution environments.

### 1. Core (`core/`)
The generic orchestration engine. These files rarely change across different domains.
- **`__main__.py` & `loop.py`**: The Execution Loop. Replaces the `adk run` CLI. Drives the ADK `Runner.run_async` generator and processes events.
- **`imports.py`**: A centralized manifest of the required Google ADK classes (`Runner`, `Session`, etc.).
- **`session.py`**: Owns conversational memory across restarts using `DatabaseSessionService`.
- **`agent.py`**: The Brain. Configures the core `LlmAgent`, binding the model, tools, and callbacks.
- **`paths.py` & `config.py`**: Centralized environment variables, path resolution, and the workspace sandbox boundary.

### 2. Safety (`safety/`)
Guardrails, Human-In-The-Loop gates, and validation logic.
- **`guardrails.py`**: Uses `before_tool_callback` to silently intercept and deny dangerous tool executions (e.g., path traversal outside the workspace) before they happen.
- **`gate.py`**: Uses `before_tool_callback` (chained after the guardrails) to pause safe, mutating operations, invoking `tool_context.request_confirmation()` to demand human approval via the REPL.
- **`hooks.py`**: Uses `after_tool_callback` to run validation logic (linting, schema checks, etc.) on tool outputs before returning them to the model for self-correction.

### 3. Extensions (`extensions/`)
The domain extensibility layer, representing the standard ways to augment a minimalist harness.
- **`skills/`**: Progressive disclosure. A folder per domain containing a `SKILL.md` (instructions) and bundled deterministic scripts. Crucially, the harness exposes a dedicated `read_skill(skill_name)` native tool to safely fetch these from outside the workspace sandbox without LLM path hallucinations.
- **`mcp/`**: Pre-built configurations to expose structured tools directly to the LLM. In addition to standard remote `McpToolset` integration, we natively embed `FastMCP` local servers (e.g. `local_server.py`) using `StdioServerParameters` to bring Python tool validation in-process.
- **`commands/`**: Frozen slash commands and prompt templates for recurring workflows.
- **`subagents/`**: Factories for spawning fresh contexts/sub-agents to process isolated tasks without polluting the main context window.

### 4. Tools (`tools/`)
The fixed native capabilities the harness ships with:
- `read_file`, `write_file`, `edit_file`, `run_bash`, `grep_search`, and `glob_search`. By promoting `grep` and `glob` to core tools, the harness guarantees structured parsing for codebase navigation instead of relying on bash string streams.

### 5. Workspace (`workspace/`)
The strictly sandboxed execution environment.
- The `WORKSPACE_DIR` acts as the definitive hard boundary for all tool operations. The guardrails enforce that the agent cannot read, write, or execute commands in paths that resolve above this root, ensuring safe, contained agentic behavior.

### WebApp UI
- **`webapp/`**: A Next.js application integrated to drive the harness loop graphically (instead of the terminal REPL), including a `/clear` API endpoint to cleanly reset the workspace sandbox between sessions.
