# ADK Agent Tutorial
- status: active
- type: tutorial
- description: Step-by-step tutorial for building and running an ADK agent pipeline: imports.py centralization, tool definition, LlmAgent configuration, and execution with adk run.
- label: [agent, core, skill]
- injection: procedural
- volatility: stable
- last_checked: 2026-03-17
<!-- content -->
This document explains the steps involved in the creation and execution of the `tutorial_agent` pipeline available in this repository.

## The Pipeline Steps
Building an ADK agent involves three core steps, all of which are demonstrated in `tutorial_agent/agent.py` and `tutorial_agent/imports.py`.

### Step 1: Framework Component Centralization
Instead of importing classes from deep within the `google.adk` library across multiple files, we centralize them in `tutorial_agent/imports.py`.

*   **Why?** The ADK library is extensive. Centralizing imports (like `LlmAgent`, `SequentialAgent`, `BaseAgent`) prevents long, messy import blocks in your actual logic files. It also provides a single source of truth for the components your playground utilizes.

### Step 2: Define Tools
Tools are Python functions that the LLM can decide to execute when it needs to access external information or perform an action "in the real world."

In `tutorial_agent/agent.py`, we defined `get_current_time(city: str) -> dict`.

*   **How it works:** When the user asks "What time is it in Paris?", the LLM recognizes it needs that information. It pauses its text generation, formats a JSON request to call `get_current_time("Paris")`, intercepts the mock dictionary response, and then continues generating the final text for the user using that new context.

### Step 3: Initialize the Agent
The `LlmAgent` class ties everything together. In `agent.py`, we initialize the `root_agent` with several key parameters:

*   **`model`**: Specifies the underlying intelligence (e.g., `gemini-2.5-flash`).
*   **`name`**: A programmatic identifier, crucial when orchestrating multiple agents.
*   **`description`**: Explains what this agent does. If another agent wants to delegate a task to, it reads this description to know if this agent is the right choice.
*   **`instruction`**: The system prompt. This dictates the agent's persona, constraints, and operational guidelines.
*   **`tools`**: The list of Python functions (like `get_current_time`) the agent is permitted to execute.

## Running the Pipeline
Once the agent is defined, the ADK framework provides built-in runners to execute it:

1.  **CLI Runner (`adk run`)**: Initializes the terminal-based interactive chat loop.
2.  **Web Runner (`adk web`)**: Spins up a local FastAPI server (defaulting to port `8000`) and provides a browser-based chat interface.

Both runners automatically seek out the `root_agent` defined in your designated agent directory.
