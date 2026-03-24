# ADK Agent Designer — Visual Architecture Tool
- status: active
- type: agent_skill
- id: ecosystem.designer.skill
- last_checked: 2026-03-05
- label: [guide, reference, frontend]
<!-- content -->
The `ecosystem/` project is a **visual multi-agent architecture designer** built with React + React Flow. It lets you design ADK multi-agent pipelines by dragging and connecting nodes on a canvas, then exporting a working `agent.py` file.

Think of it as a local, ADK-specific version of [n8n](https://n8n.io/).

## Running the Designer
- status: active
- type: documentation
- id: ecosystem.designer.skill.running
- last_checked: 2026-03-05
<!-- content -->
```bash
cd ecosystem
npm install        # first time only
npm run dev        # opens http://localhost:5173
```

For a production build:
```bash
npm run build      # outputs to ecosystem/dist/
npm run preview    # serves the build locally
```

## Information Flow Model
- status: active
- type: documentation
- id: ecosystem.designer.skill.flow
- last_checked: 2026-03-24
<!-- content -->
Every pipeline on the canvas is a directed graph of **information flow** — data moves from node to node, being transformed at each step. Edges represent the path information travels, not just which agent controls which.

### Single-turn flow (default)
The canonical shape is linear:

```
👤 Human → [agents / tools] → Output
```

The **Human node is the entry point**: it represents the user's request entering the system. Information flows forward through LLM agents, tools, and workflow orchestrators until a final output is produced. The Human node appears **once** per pipeline.

### Looping pipeline
When the task requires iteration — e.g., "keep refining until the output is good enough" — the pipeline is wrapped in a `LoopAgent`:

```
👤 Human → LoopAgent ┐
                     ├─ [processing agents]
                     └─ ✅ Evaluator  ──(exit_loop if satisfied)──► Output
```

The `LoopAgent` re-runs its sub-agents on each iteration. The **Evaluator node** sits at the end of the loop and checks the current output against a success condition. If satisfied, it calls `exit_loop` and the pipeline terminates. If not, the loop continues up to `max_iterations`.

### Stop conditions
Stop conditions are expressed as properties of the **Evaluator node**:

| Field | Meaning |
| :--- | :--- |
| `success_condition` | Natural-language rubric the LLM evaluator checks against (e.g., *"The answer is factually correct and under 200 words"*) |
| `model` | Which LLM judges the output |

`max_iterations` on the parent `LoopAgent` acts as the hard upper bound regardless of the success condition.

### Edge semantics
Edges always carry information in the direction of the arrow. The color indicates the *relationship* between sender and receiver:

| Color | Meaning |
| :--- | :--- |
| Indigo (animated) | Workflow agent → sub-agent (orchestration + data) |
| Orange | LLM agent → delegated agent |
| Teal dashed | Any agent → tool (function call) |

## Node Types
- status: active
- type: documentation
- id: ecosystem.designer.skill.nodes
- last_checked: 2026-03-24
<!-- content -->
| Node | Color | ADK Class | Purpose |
| :--- | :--- | :--- | :--- |
| 👤 Human / User | Yellow | — | Entry point: the user's request entering the pipeline |
| 🤖 LLM Agent | Blue | `LlmAgent` | Intelligent agent driven by an LLM |
| ➡️ Sequential | Green | `SequentialAgent` | Runs sub-agents one after another |
| ⚡ Parallel | Purple | `ParallelAgent` | Runs sub-agents concurrently |
| 🔄 Loop | Orange | `LoopAgent` | Iterates sub-agents until exit signal or max iterations |
| ✅ Evaluator | Emerald | `LlmAgent` + `exit_loop` | Checks output against a success condition; exits loop when satisfied |
| 🔧 Tool | Gray | Python function | Custom callable tool for an LlmAgent |
| 🔌 MCP Toolset | Teal | `McpToolset` | Connects an external MCP server to an LlmAgent |
| 🧠 Observation Set | Pink | (Memory Tool) | Represents persistent knowledge graph entities or observations |

## How to Use
- status: active
- type: documentation
- id: ecosystem.designer.skill.howto
- last_checked: 2026-03-05
<!-- content -->

### Building a pipeline
1. **Drag** a node from the left palette onto the canvas.
2. **Connect** nodes by dragging from a bottom handle (sub-agent) or right handle (tool) to another node's top handle.
3. **Click** any node to open its properties in the right panel.
4. **Edit** fields: name, model, instruction, output_key, max_iterations, MCP command, etc.

### Edge types
- **Sub-agent edge** (solid animated line): connects a workflow agent to its child agents. Draw from the **bottom handle** of the parent.
- **Tool edge** (dashed line): connects a Tool or McpToolset to an LlmAgent. Draw from the **right handle** of the LlmAgent.

### Observation Sets & Memory
The **Observation Set** node represents persistent facts managed by the **MCP Memory Server** (`@modelcontextprotocol/server-memory`). You can visually connect these nodes to represent state or facts that an `LlmAgent` should read from or write to the knowledge graph, giving the pipeline cross-session memory.

### Saving & loading
- **Save** stores the current canvas as JSON in `localStorage`.
- **Load** restores the last saved design.

### Exporting Python
Click **Export Python** in the toolbar — the browser downloads an `agent.py` file containing valid ADK code matching your design. The generator:
1. Topologically sorts nodes (leaves first).
2. Emits tool function defs and MCP toolset factories first.
3. Emits agent instantiations in dependency order.
4. Assigns `root_agent` to the top-level workflow agent.
5. Generates only the imports needed for the types you used.

## File Structure
- status: active
- type: documentation
- id: ecosystem.designer.skill.files
- last_checked: 2026-03-05
<!-- content -->
```
ecosystem/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── ADK_DESIGNER_SKILL.md         ← this file
└── src/
    ├── main.tsx                  ← React entry point
    ├── App.tsx                   ← Layout: palette | canvas | properties
    ├── App.css
    ├── index.css
    ├── types/
    │   └── agent.ts              ← AgentKind, NodeData unions, helpers
    ├── nodes/                    ← One React Flow custom node per ADK type
    │   ├── BaseNode.tsx / .css   ← Shared node shell
    │   ├── LlmAgentNode.tsx
    │   ├── SequentialAgentNode.tsx
    │   ├── ParallelAgentNode.tsx
    │   ├── LoopAgentNode.tsx
    │   ├── ToolNode.tsx
    │   └── McpToolsetNode.tsx
    ├── components/
    │   ├── NodePalette.tsx / .css   ← Left drag-and-drop sidebar
    │   ├── PropertyPanel.tsx / .css ← Right property editor
    │   └── Toolbar.tsx / .css       ← Top action bar
    └── utils/
        └── codeGenerator.ts         ← Graph → Python ADK code
```

## Extending the Designer
- status: active
- type: documentation
- id: ecosystem.designer.skill.extending
- last_checked: 2026-03-05
<!-- content -->
| Extension | How to add |
| :--- | :--- |
| **New node type** | Add to `AgentKind` in `types/agent.ts`, create a component in `nodes/`, add to `PALETTE_ITEMS`, handle in `codeGenerator.ts` |
| **New model option** | Add to the `<select>` in `PropertyPanel.tsx` |
| **Persist to file** | Replace `localStorage` in Toolbar with a `fetch` call to a local server |
| **Load existing agent.py** | Write a Python → graph JSON parser (reverse of `codeGenerator.ts`) |
| **Auto-layout** | Integrate `@dagrejs/dagre` to arrange nodes automatically after import |
