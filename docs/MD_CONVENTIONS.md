# Markdown-JSON Hybrid Schema Conventions (Diátaxis Edition)
- status: active
- type: reference
- id: mddia_conventions
- label: [core, normative]
- last_checked: 2026-03-17
- injection: directive
- volatility: stable
<!-- content -->

This document defines the strict conventions for the **Markdown-JSON Hybrid Schema** used in this project for hierarchical task coordination, agentic planning, and context injection.

Every Markdown file following this schema can be **losslessly converted to JSON** and back. This enables:
- Clear, abstract protocol definitions
- Programmatic manipulation via JSON
- Human-readable documentation via Markdown
- Intelligent context assembly for LLM prompt injection

This edition integrates the **Diátaxis** technical documentation framework ([diataxis.fr](https://diataxis.fr/)) and an **injection role** axis designed for knowledge bases whose primary function is context injection into AI agent prompts.

## Core Principle
The system uses **Markdown headers** to define the structural hierarchy (the nodes) and **YAML-style metadata blocks** (immediately following the header) to define structured attributes. The entire tree can be serialized to JSON with a `content` field preserving the prose.

Every file self-describes along four orthogonal dimensions:

1. **Content function** (`type`) — *How to read* the document. Derived from Diátaxis for content files, or from workflow role for operational files.
2. **Domain and audience** (`label`) — *Who it's for* and *what area it covers*. Additive tags for filtering and routing. Governed by a central `label_registry.json`.
3. **Injection role** (`injection`) — *What role the document plays* when injected into an agent's context window. Guides the context assembly pipeline.
4. **Content maturity** (`volatility`) — *How well-developed the document's content is*. Distinct from `status`, which tracks task/plan progress. Informs cache and re-verification decisions.

## Filename Naming Convention
Every file in `content/` MUST follow the pattern `TOPIC_SUFFIX.md`, where `TOPIC` is `SCREAMING_SNAKE_CASE` and `SUFFIX` is derived directly from the file's `type` field:

| `type` | Required suffix | Example |
|:---|:---|:---|
| `tutorial` | `_TUTORIAL` | `ADK_AGENT_TUTORIAL.md` |
| `how-to` | `_SKILL` | `GCLOUD_SKILL.md` |
| `reference` | `_REF` | `MCP_REF.md` |
| `explanation` | `_EXPLANATION` | `ENGINE_EXPLANATION.md` |
| `plan` | `_PLAN` | `MASTER_PLAN.md` |
| `log` | `_LOG` | `AGENTS_LOG.md` |
| `task` | `_TASK` | `DEPLOY_TASK.md` |
| `workflow` | `_WORKFLOW` | `LINKEDIN_PIPELINE_WORKFLOW.md` |

**Rules:**
- The suffix encodes the `type` unambiguously. A reader can determine a file's Diátaxis category from the filename alone, without opening it.
- When two files share the same topic under the same type, disambiguate by appending a qualifier before the suffix: `MCP_REF.md` (protocol overview) vs. `MCP_TOOLS_REF.md` (data tools spec).
- Root-level operational files (`AGENTS.md`, `MD_CONVENTIONS.md`, `README.md`, `HOUSEKEEPING.md`) are exempt from this convention — they follow project-standard names.
- The folder a file lives in (`tutorials/`, `how-to/`, `reference/`, `explanations/`, `plans/`, `logs/`) MUST match its `type`. File and folder together are redundant by design — this catches misplaced files immediately.

## Schema Rules
### 1. Hierarchy & Nodes
- **Headers**: Use standard Markdown headers (`#`, `##`, `###`) to define the hierarchy.
- **Nesting**:
    - `#` is the Root/Document Title (usually only one per file).
    - `##` are Top-Level Tasks/Features.
    - `###` are Subtasks.
    - And so on.
- **Implicit Dependency**: A header is implicitly dependent on its parent header.
- **Explicit Dependency (DAG)**:
    - Use the `blocked_by` metadata field to define dependencies on other nodes (siblings, cousins, etc.).
    - Pass a list of IDs or relative paths to allow a single node to depend on multiple prior nodes.
    - **Example**: `blocked_by: [task-a, task-b]` implies this node cannot start until both 'task-a' and 'task-b' are done.

### 2. Metadata Blocks
- **Location**: Metadata MUST be placed **immediately** after the header.
- **Separator**: There MUST be a `<!-- content -->` line between the metadata block and the content. This HTML comment acts as an unambiguous separator that is invisible when rendered but easy for parsers to detect.
- **Format**: A strict list of key-value pairs as a bulleted list.

**Example:**

```markdown
## Implement User Auth
- status: in-progress
- type: how-to
- id: project.user_auth
- label: [backend]
- injection: procedural
- volatility: evolving
- owner: dev-1
- estimate: 3d
- blocked_by: []
<!-- content -->
This section describes the implementation details...
```

#### Metadata Placement Policy
Where metadata blocks appear depends on the document's `type`. The goal is to minimize token overhead for context injection while preserving the per-node tracking that operational documents need.

**Content documents** (`tutorial`, `how-to`, `reference`, `explanation`):

- Metadata is placed **only on the root `#` header**. Subsections (`##`, `###`, etc.) use standard Markdown headers without metadata blocks.
- Rationale: content documents are the atomic unit for context injection. The pipeline cares about the document-level classification (`type`, `injection`, `volatility`, `label`), not about individual subsections. Eliminating per-subsection metadata reduces token overhead — often by hundreds of tokens — which matters directly for the agent attention budget (see the Document Sizing section). When the agent receives a content document, it sees one metadata block at the top and then clean prose from that point onward.
- Subsections remain structurally meaningful — the parser still builds a node tree from headers — but subsection nodes inherit the root's metadata and carry no independent metadata fields.

**Operational documents** (`plan`, `task`, `log`):

- Metadata is placed **on every node** that requires independent tracking. Each subtask within a plan genuinely needs its own `status`, `owner`, `estimate`, and `blocked_by` fields.
- Rationale: operational documents are hierarchical task trees where each node is an independent work unit. The value of per-node metadata outweighs the token cost because these documents are typically queried for specific node status rather than injected as full-text context.

**Why the distinction matters for agents:**

When a content document is injected into an agent's context window, every metadata block that is not at the root is wasted attention. The agent sees `- status: active` and `- type: reference` repeated dozens of times but gains no actionable signal from any of them — the root metadata already told it everything it needs to know about how to consume the file. Removing this repetition frees tokens for actual content and keeps the agent's attention on the material that matters.

For operational documents the calculus reverses: an agent querying "what tasks are blocked?" needs per-node `status` and `blocked_by` fields to answer the question. Here the metadata IS the content.

**Migration note:** Existing content documents with per-subsection metadata should be migrated by stripping metadata from all headers except `#`. The parser maintains backward compatibility — files with per-subsection metadata will still parse — but all new content documents and all files undergoing revision should follow the top-level-only policy.

### 3. Allowed Fields
The following fields are standard. The schema allows extensibility, but extended fields must follow the conventions at the end of this section.

| Field | Type | Description |
|:---|:---|:---|
| `status` | `enum` | `todo`, `in-progress`, `done`, `blocked`, `recurring`, `active` **(Mandatory)** |
| `type` | `enum` | `tutorial`, `how-to`, `reference`, `explanation`, `plan`, `task`, `log` **(Mandatory)** |
| `id` | `string` | Unique identifier for the node (e.g., `project.component.task`). Used for robust merging and dependency tracking. **(Optional but strongly recommended)** |
| `description` | `string` | One-sentence semantic summary of the document's content. Written in MCP tool-description style: keyword-rich, action-oriented, and precise enough for the context assembly pipeline to route queries to this document without opening it. **(Optional but strongly recommended for content documents)** |
| `label` | `list` | Array of strings for filtering and routing (e.g., `[core, normative, backend]`). Values MUST be drawn from `label_registry.json` unless explicitly extending it. **(Optional)** |
| `injection` | `enum` | `directive`, `informational`, `procedural`, `background`, `excluded`. Describes the document's role when injected as agent context. **(Optional)** |
| `volatility` | `enum` | `stable`, `evolving`. How well-developed the document's content is. **(Optional)** |
| `owner` | `string` | The agent or user assigned to this (e.g., `dev-1`, `claude`). **(Optional)** |
| `estimate` | `string` | Time estimate (e.g., `1d`, `4h`). **(Optional)** |
| `blocked_by` | `list` | List of explicit dependencies (IDs or relative paths). **(Optional)** |
| `priority` | `enum` | `draft`, `low`, `medium`, `high`, `critical`. **(Optional)** |
| `last_checked` | `string` | Date of the last modification (ISO-8601). **(Optional)** |

#### The `description` Field
The `description` field is a single-line string written in the style of an **MCP tool description**: the kind of text an LLM reads to decide whether to invoke a tool. The context assembly pipeline uses it for the same purpose — semantic routing — so the same writing discipline applies.

**Rules:**
- **One sentence.** State what the document covers and, if non-obvious, when to reach for it.
- **Keyword-rich.** Include the domain terms, technology names, and action verbs that a query about this document's topic would naturally contain. These are the terms the retrieval system or LLM will match against.
- **No filler.** Do not write "This document describes…" or "This file contains…". Start with the subject.
- **Functional, not promotional.** Describe what the document *does* for the reader, not how good it is.

**Examples:**

```markdown
# Markdown-JSON Hybrid Schema Conventions
- description: Schema rules, metadata fields, and Diátaxis type definitions governing all Markdown files in this knowledge base.
```

```markdown
# Deploy to Cloud Run
- description: Step-by-step procedure for building, pushing, and deploying a Docker image to Google Cloud Run using gcloud CLI.
```

For extended fields:
- The key is entirely lowercase.
- The key has no spaces (words separated with dash or underscore).
- The value is single line.

### Type Definitions (Diátaxis + Operational)
The `type` field classifies every node by its content function. Seven values are organized into two groups.

#### Diátaxis Content Types (How to Read)
These four types tell the reader (human or agent) *what kind of document this is* and *how to consume it*. They derive from the Diátaxis framework ([diataxis.fr/start-here](https://diataxis.fr/start-here/)).

| Type | Function | Writing Style | Reader Posture |
|:---|:---|:---|:---|
| `tutorial` | **(Learning)** A step-by-step guided experience. Takes the reader through a process from start to finish with guaranteed outcomes. | Imperative, hand-holding, ordered steps. Minimal theory. | "Teach me." |
| `how-to` | **(Problem-solving)** Goal-oriented instructions for solving a specific problem. Assumes the reader already has baseline competence. | Direct, focused on the goal, may list prerequisites. | "Help me do X." |
| `reference` | **(Lookup)** Factual, structured technical information designed for non-linear access. API specs, schema definitions, field tables, conventions. | Precise, consistent structure, no narrative. | "What is X exactly?" |
| `explanation` | **(Understanding)** Conceptual discussion that builds mental models. Answers "why" questions, provides context, explores alternatives. | Discursive, may include diagrams, analogies, history. | "Help me understand." |

**Choosing the correct Diátaxis type — decision test:**

```
1. Does the reader consume this LINEARLY to build understanding?
   (analogies, "why", conceptual depth)
   → type: explanation

2. Does the reader LOOK UP specific facts, rules, or definitions
   while working? (tables, specs, constraints)
   → type: reference

3. Does the reader FOLLOW this to solve a specific problem or
   complete a goal? (steps, procedures, workflows)
   → type: how-to

4. Does the reader follow this as a GUIDED LEARNING experience
   from scratch? (hands-on, guaranteed outcomes)
   → type: tutorial
```

**Counterexamples — "This looks like X but is actually Y":**

- **Changelog** → looks like `explanation`, is `log`: records historical facts in order, not a conceptual model. Test: would removing chronological order break its purpose? If yes, it's a log.
- **Config spec with sequential steps** → looks like `how-to`, is `reference`: reader jumps to a setting, reads the value, closes the file. Steps are structure, not a workflow.
- **Architecture decision record (ADR)** → looks like `reference`, is `explanation`: reader consumes linearly to understand *why* a decision was made, not to look up a fact.
- **Troubleshooting FAQ** → looks like `reference`, is `how-to`: each entry is a mini-procedure ("if error X, do Y"), not a lookup.

When a document mixes modes, assign the `type` of the dominant mode. If modes are roughly equal and the file is large, consider splitting.

#### Operational Workflow Types (What it Does in the Project)
These three types exist outside the Diátaxis model. They serve a **project management** function, not a documentation function:

| Type | Function |
|:---|:---|
| `plan` | **(Finite)** A high-level objective with a clear beginning and end. Usually the root node of a project tree. |
| `task` | **(Finite)** A specific, actionable unit of work. Usually a sub-node of a plan. |
| `log` | **(Historical)** Append-only records of actions, decisions, or outputs. Not prescriptive. |
| `workflow` | **(Orchestration)** An ordered context injection sequence for a specific agent run. Describes which KB files are injected, in what order, and with what injection role. |

**Workflow-specific extended fields** (follow the standard extended field conventions — lowercase, no spaces, single-line value):

| Field | Type | Description |
|:---|:---|:---|
| `hitl_gate` | `bool` | `true` if human approval is required before the agent may proceed past the gate step. Default `false`. |
| `steps` | `json` | Ordered JSON array of `{"order": N, "file": "FILENAME.md", "role": "injection_role"}` objects describing the injection sequence. |

### Injection Role Definitions
The `injection` field describes the document's **operational role when injected into an agent's context window**. This is the dimension that distinguishes a knowledge base built for context injection from standard documentation.

```
injection: directive | informational | procedural | background | excluded
```

| Value | Meaning | Agent Behavior When Injected |
|:---|:---|:---|
| `directive` | Contains rules, constraints, or conventions the agent MUST follow. | Agent treats content as behavioral constraints. Compliance is mandatory. |
| `informational` | Provides factual knowledge the agent may use for reasoning. | Agent uses content as working knowledge. Reference is optional. |
| `procedural` | Contains step-by-step processes the agent should execute. | Agent follows content as an action script. Sequence matters. |
| `background` | Provides conceptual depth for improved reasoning quality. | Agent absorbs content into its working model. No direct action required. |
| `excluded` | Deliberately excluded from the context injection pipeline. | The pipeline MUST NOT inject this document. It exists for human readers or archival purposes only. |

**Typical correlations with Diátaxis types** (these are defaults, not rules — override when the content warrants it):

| Diátaxis Type | Typical Injection Role | Why |
|:---|:---|:---|
| `tutorial` | `procedural` | Tutorials are step-by-step scripts. |
| `how-to` | `procedural` or `directive` | How-tos guide action; some contain mandatory rules. |
| `reference` | `directive` or `informational` | Normative references constrain; descriptive references inform. |
| `explanation` | `background` | Explanations build the agent's conceptual model. |
| `plan` / `task` | `informational` | Operational context about project state. |
| `log` | `informational` | Historical records informing current decisions. |

**Context assembly implications:**

1. **Priority ordering**: `directive` documents are injected first (closest to system prompt). `background` next (conceptual frame). `informational` and `procedural` follow as needed. `excluded` documents are never injected.
2. **Context window budgeting**: `directive` documents are never dropped when the window is tight. `background` can be summarized. `informational` can be selectively included by relevance. `excluded` documents are skipped entirely.
3. **Agent self-awareness**: An agent seeing `injection: directive` knows "I must comply." An agent seeing `injection: background` knows "this shapes my understanding but doesn't prescribe specific actions." The metadata block at the top of the document provides this signal directly to the agent at runtime — this is why content documents retain their root metadata block even though subsection metadata is stripped (see Metadata Placement Policy).

The field is optional.

### Volatility Definitions
The `volatility` field describes **how well-developed a document's content is**. It is distinct from `status`, which tracks workflow progress for tasks and plans. `volatility` expresses the maturity and stability of the writing itself.

```
volatility: stable | evolving | initial_draft
```

| Value | Meaning | Pipeline Behavior |
|:---|:---|:---|
| `stable` | Content is complete and well-settled. Core conventions, foundational explanations, finalized architecture decisions. | Cache aggressively. Low re-verification priority. |
| `evolving` | Content has substance but is actively being developed or updated. Feature docs, guides, active plans, logs. | Cache with moderate TTL. Prefer fresh fetch when possible. |
| `initial_draft` | Content is in early draft state — incomplete, unreviewed, or skeletal. Not yet reliable for injection. | Do not cache. Flag for author review before use. |

The combination of `last_checked` + `volatility` informs cache and re-verification decisions. If absent, the pipeline defaults to `evolving`.

**Typical correlations with types:**

| Type | Typical Volatility |
|:---|:---|
| `reference` (normative), `explanation` | `stable` |
| `how-to`, `tutorial`, `plan`, `task`, `log`, `workflow` | `evolving` |
| Any type when first created and not yet reviewed | `initial_draft` |

### Standard Labels and Label Governance
Labels are lists of strings, allowing multiple keywords for a single node. All label values MUST be drawn from the central `label_registry.json` file unless explicitly extending it through the registration process described below.

**Audience & Role:**

| Label | Purpose |
|:---|:---|
| `agent` | Content primarily consumed by AI agents (prompt context, skill definitions). |
| `human` | Content primarily for human readers (onboarding docs, strategy notes). |
| `skill` | Defines a capability, persona, or specialized toolset for an agent. |
| `normative` | Contains rules, constraints, or conventions that MUST be followed. |

**Domain:**

| Label | Purpose |
|:---|:---|
| `infrastructure` | Deployment, CI/CD, cloud resources. |
| `frontend` | Client-side application, UI, UX. |
| `backend` | Server-side logic, data processing, MCP servers. |

**Status & Structure:**

| Label | Purpose |
|:---|:---|
| `core` | Essential foundational document for the repository. |
| `template` | General content that needs specialization for particular projects. |
| `draft` | Incomplete, under construction, or lacking clarity. |
| `planning` | Project plans, roadmaps, objective outlines. |
| `source-material` | Textbooks, external manuals, or deep-dive materials brought in for context injection. |

#### The Label Registry (`label_registry.json`)
All valid labels are enumerated in a central `label_registry.json` file at the repository root. This prevents label sprawl — the gradual accumulation of synonymous or overlapping labels (e.g., `api`, `api-server`, `backend-api`) that degrades the filtering and routing system.

**Registry format:**

```json
{
  "version": "1.0",
  "last_updated": "2026-03-10",
  "categories": {
    "audience_role": {
      "description": "Who the document is for and what role it serves.",
      "labels": {
        "agent": "Content primarily consumed by AI agents.",
        "human": "Content primarily for human readers.",
        "skill": "Defines a capability, persona, or specialized toolset for an agent.",
        "normative": "Contains rules, constraints, or conventions that MUST be followed."
      }
    },
    "domain": {
      "description": "What technical area the document covers.",
      "labels": {
        "infrastructure": "Deployment, CI/CD, cloud resources.",
        "frontend": "Client-side application, UI, UX.",
        "backend": "Server-side logic, data processing, MCP servers."
      }
    },
    "status_structure": {
      "description": "Document maturity and structural role.",
      "labels": {
        "core": "Essential foundational document for the repository.",
        "template": "General content that needs specialization.",
        "draft": "Incomplete, under construction, or lacking clarity.",
        "planning": "Project plans, roadmaps, objective outlines.",
        "source-material": "External materials brought in for context injection."
      }
    }
  }
}
```

**Validation rule:**

The parser MUST validate all values in the `label` field against `label_registry.json`. If a label is not found in the registry, the parser MUST emit an error:

```
ERROR: Unknown label 'api-server' in file 'DEPLOY_HOW_TO.md'.
       Valid labels: agent, human, skill, normative, infrastructure,
       frontend, backend, core, template, draft, planning, source-material.
       To add a new label, register it in label_registry.json first.
```

**Adding a new label:**

1. Add the label to the appropriate category in `label_registry.json` with a one-line description.
2. If no existing category fits, create a new category with a `description` field.
3. Commit the registry update BEFORE committing files that use the new label. This ensures the parser never encounters an unregistered label in CI.

### 4. Dependencies
Dependencies are managed centrally in `dependency_registry.json`.

To add a dependency:
1. Use `python manager/dependency_manager.py add <file> <dependency>` (if available).
2. Or manually edit `dependency_registry.json`.

**Resolution Protocol**:
1. **Registry First**: Tools and agents look up the current file in the registry to find its dependencies.
2. **Recursive Resolution**: Dependencies are resolved recursively to build the full context.

### 5. Context & Content
- Any text following the metadata block (after the `<!-- content -->` separator) is considered "Context" or "Content".
- It can contain free-form Markdown, code blocks, images, etc.

## Examples
### Valid Node (Content Document)
```markdown
# Coding Standards
- status: active
- type: reference
- id: project.coding_standards
- description: Mandatory Python coding conventions: type hints, Google-style docstrings, and function length limits.
- label: [core, normative, backend]
- injection: directive
- volatility: stable
- last_checked: 2026-03-10
<!-- content -->
All Python code must use type hints. Docstrings follow Google style.
Functions over 30 lines must be refactored.
```

### Valid Node (Operational Document — Plan with Tasks)
```markdown
# User Authentication System
- status: in-progress
- type: plan
- id: project.user_auth
- label: [backend, planning]
- injection: informational
- volatility: evolving
- last_checked: 2026-03-20
<!-- content -->
Implement full authentication stack with OAuth2 support.

## Database Schema
- status: done
- type: task
- id: project.user_auth.db_schema
- owner: dev-2
- estimate: 1d
<!-- content -->
Set up PostgreSQL schema for users and sessions.

## API Endpoints
- status: in-progress
- type: task
- id: project.user_auth.api_endpoints
- owner: dev-1
- estimate: 3d
- blocked_by: [project.user_auth.db_schema]
<!-- content -->
Implement login, logout, and token refresh endpoints.
```

Note: Operational documents (`plan`, `task`, `log`) retain per-node metadata because each node is an independent work unit with its own status, owner, and dependencies.

### Invalid Node (Missing separator)
```markdown
## Title
- status: active
- type: reference
Content starts here...
```

*Error: Missing `<!-- content -->` separator between metadata and content.*

### Invalid Node (Unregistered label)
```markdown
## API Gateway Config
- status: active
- type: reference
- label: [api-server, backend]
<!-- content -->
```

*Error: Unknown label `api-server`. Valid labels are defined in `label_registry.json`. To add a new label, register it in the registry first.*

## Parsing Logic (for Developers)
1. **Scan for Headers**.
2. **Look ahead** at the lines immediately following the header.
3. **Parse lines** that match the METADATA key-value pattern (`- key: value`) until the `<!-- content -->` separator or a non-matching line is found.
4. **Everything else** until the next header of equal or higher level is "Content".

> [!NOTE]
> The parser maintains backward compatibility with files using a blank line as separator, but all new files and migrations should use `<!-- content -->`.

**Validation rules:**
- `type` — MUST be one of: `tutorial`, `how-to`, `reference`, `explanation`, `plan`, `task`, `log`, `workflow`. Emit a hard error otherwise.
- `injection` — Optional. If present, MUST be one of: `directive`, `informational`, `procedural`, `background`, `excluded`.
- `volatility` — Optional. If present, MUST be one of: `stable`, `evolving`, `initial_draft`. Defaults to `evolving` if absent.
- `label` — Optional. If present, every value MUST exist in `label_registry.json`. Emit a hard error for unregistered labels.
- Atypical `type` × `injection` combinations — Emit a soft warning; suppress with `atypical_confirmed: true` in the metadata.
- Metadata on non-root headers in content-type documents — Emit a soft warning.

## Tooling Reference
The following Python scripts are available in `language/` to interact with this schema:

### 1. `language/md_parser.py`
- **Purpose**: The core parser enabling **bidirectional MD ↔ JSON** transformation.
- **Key Classes**:
    - `MarkdownParser`: Parses `.md` files into a `Node` tree
    - `Node`: Tree node with `to_dict()`, `from_dict()`, and `to_markdown()` methods
- **Transformations**:
    - **MD → JSON**: `parser.parse_file("file.md")` → `root.to_dict()` → `json.dumps()`
    - **JSON → MD**: `json.loads()` → `Node.from_dict(data)` → `root.to_markdown()`
- **CLI Usage**: `python3 language/md_parser.py <file.md>`
- **Output**: JSON representation of the tree or validation errors.

### 2. `language/visualization.py`
- **Purpose**: Visualizes the task tree in the terminal with metadata.
- **Usage**: `python3 language/visualization.py <file.md>`
- **Output**: Unicode tree visualization.

### 3. `language/operations.py`
- **Purpose**: Manipulate task trees (merge, extend).
- **Usage**:
    - **Merge**: `python3 language/operations.py merge <target.md> <source.md> "<Target Node Title>" [--output <out.md>]`
        - Inserts the source tree as children of the specified target node.
    - **Extend**: `python3 language/operations.py extend <target.md> <source.md> [--output <out.md>]`
        - Appends the source tree's top-level items to the target tree's top level.

### 4. `language/migrate.py`
- **Purpose**: Heuristically adds default metadata to standard Markdown headers to make them schema-compliant.
- **Usage**: `python3 language/migrate.py <file.md> [file2.md ...]`
- **Effect**: Modifies files in-place by injecting `- status: active` and `- type: explanation` (safe default) after headers that lack metadata.

### 5. `language/importer.py`
- **Purpose**: Converts legacy documents (`.docx`, `.pdf`, `.doc`) into Markdown and auto-applies the Protocol.
- **Usage**: `python3 language/importer.py <file.docx> [file.pdf ...]`
- **Capabilities**:
    - **DOCX**: Preserves headers (Heading 1-3) if `python-docx` is installed. Fallbacks to text extraction.
    - **PDF**: Extracts text if `pypdf` or `pdftotext` is available.
    - **DOC**: Uses MacOS `textutil` for text extraction.

## Migration Guidelines
### Migrating Existing Standard Documentation
When migrating existing documentation to this schema for the first time:
1. **Run the Migration Script**: Use `language/migrate.py` to add baseline metadata.
2. **Review and Refine**: Apply the decision test to assign correct `type` values. Update `status` fields where appropriate. Add `injection` roles for files entering the context pipeline. Add `volatility` signals.
3. **Structure Check**: Ensure the hierarchy makes sense as a task/node tree.

## Best Practices for AI Generation
When generating or modifying files in this repository, AI agents MUST adhere to the following best practices to ensure system stability and parsing accuracy:

1. **Always Generate IDs**: When creating new nodes, always generate a unique `id` in the metadata (e.g., `id: component.subcomponent.task`). This ensures that references remain stable even if titles change.

2. **Update Timestamps**: When modifying a node, update the `last_checked` field to the current date (ISO-8601).

3. **Strict Spacing**: You **MUST** add a `<!-- content -->` separator line between the metadata block and the content. This is critical for the parser to distinguish between metadata and content lists.
    - *Correct*:
        ```markdown
        ## Title
        - status: active
        - type: reference
        <!-- content -->
        Content starts here...
        ```
    - *Incorrect*:
        ```markdown
        ## Title
        - status: active
        - type: reference
        Content starts here...
        ```

4. **Use Valid Types Only**: Only use the eight valid `type` values: `tutorial`, `how-to`, `reference`, `explanation`, `plan`, `task`, `log`, `workflow`.

5. **Assign Injection Roles**: When creating files that will be injected into agent context, always include the `injection` field. Choose the value that best describes the operational role:
    - `directive` → Rules the agent must obey.
    - `informational` → Facts the agent may use.
    - `procedural` → Steps the agent should execute.
    - `background` → Concepts the agent should absorb.
    - `excluded` → Deliberately excluded from injection.

6. **Assign Volatility**: Always include the `volatility` field. When in doubt, default to `evolving`.

7. **Choose Types via the Decision Test**: Before assigning a `type`, apply the decision test from the Type Definitions section. Do not guess. The most common mistake is labeling a conceptual explainer as `reference` — if the reader consumes the document linearly to build understanding, it is `explanation`. Review the counterexamples section if the classification feels ambiguous.

8. **Use Registered Labels Only**: Only use label values that exist in `label_registry.json`. If a new label is needed, register it in the registry first.

9. **Content Documents: Root Metadata Only**: For content-type documents (`tutorial`, `how-to`, `reference`, `explanation`), place metadata only on the root `#` header. Subsections use plain Markdown headers without metadata blocks.

10. **Operational Documents: Per-Node Metadata**: For operational-type documents (`plan`, `task`, `log`, `workflow`), place metadata on every node that requires independent tracking.

## Document Sizing: How Much Should a Markdown Contain?

### Sizing Recommendations Summary
| Type × Injection | Target Length | Hard Ceiling | Rationale |
|:---|:---|:---|:---|
| `reference` + `directive` | 500–1,500 words per rule section | 3,000 words total | Rules compete for attention; shorter = higher compliance. Non-linear access permits longer totals if sections are focused. |
| `how-to` + `directive` | 500–1,500 words | 2,000 words | Mandatory procedures must be fully absorbed. |
| `how-to` + `procedural` | 500–2,000 words | 2,500 words | One workflow, one goal. 5–12 steps. |
| `explanation` + `background` | 1,500–4,000 words | 5,000 words | Front-load the insight. Structural resets every ~800 words. |
| `reference` + `informational` | 2,000–6,000 words | No hard ceiling | Non-linear access; internal organization matters more than total length. |
| `tutorial` + `procedural` | 2,000–5,000 words | 6,000 words | Sequential, guided; can be longer but should have one learning arc. |
| `log` + `informational` | 3–5 sentences per entry | No hard ceiling | Grows over time. Newest first. Individual entries concise. |
| `plan` / `task` + `informational` | 200–1,000 words | 2,000 words | Operational context should be concise and scannable. |
| `workflow` + `directive` | 100–400 words | 600 words | Injection table + gate description only. Brevity is the point. |
| Any type + `excluded` | No constraint | No constraint | Not injected into agent context. Size for human readers only. |

These are guidelines, not rules. A document that genuinely covers one coherent concept may exceed its target; prefer semantic coherence over arbitrary length limits.

## Metadata Template (Copy-Paste)
**Mandatory fields:** `status`, `type`.

**For content documents** (metadata on root `#` header only):

```markdown
# [Document Title]
- status: active
- type: [tutorial | how-to | reference | explanation]
- id: [parent.child.node]
- description: [One-sentence, keyword-rich summary for semantic routing.]
- label: [label1, label2]
- injection: [directive | informational | procedural | background | excluded]
- volatility: [stable | evolving]
- last_checked: YYYY-MM-DD
<!-- content -->
```

**For operational documents** (metadata on every node):

```markdown
# [Project Title]
- status: in-progress
- type: plan
- id: [project_id]
- label: [label1, label2]
- injection: informational
- volatility: evolving
- last_checked: YYYY-MM-DD
<!-- content -->

## [Task Title]
- status: todo
- type: task
- id: [project_id.task_id]
- owner: [agent-or-user]
- estimate: [time]
- blocked_by: [dependency_ids]
<!-- content -->
```
