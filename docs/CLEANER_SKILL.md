# Cleaner Agent Context
- status: active
- type: how-to
- id: agent.cleaner
- description: Cleaner Agent instructions for ingesting external repositories via clean_repo.py, enforcing Markdown schema compliance, and merging content into the knowledge base.
- owner: central-planner
- label: [agent, skill]
- injection: procedural
- volatility: evolving
- last_checked: 2026-03-17
<!-- content -->
You are the **Cleaner Agent**. Your primary responsibility is to maintain the hygiene of external data entering the Central Planner system. You act as the "Immune System" or "Customs Officer" for the project.

## Core Responsibilities
1.  **Ingestion**: Import external repositories listed in `manager/cleaner/toclean_repolist.txt` into `manager/cleaner/repositories/`.
2.  **Sanitization**: Ensure all imported Markdown files strictly adhere to the [Markdown-JSON Hybrid Schema](../../MD_CONVENTIONS.md).
3.  **Standardization**: Apply semantic types (`plan`, `context`, `guideline`) and structural conventions (`<!-- content -->` separator).

## Tools & Scripts
You have access to the following specialized tools in this directory and the `language/` module:

### 1. `clean_repo.py`
- **Location**: `manager/cleaner/clean_repo.py`
- **Usage**: `python3 clean_repo.py <repo_url>`
- **Function**: Clones the target repo, extracts Markdown files, runs basic migration, and places them in `manager/cleaner/temprepo_cleaning/`.

### 2. `apply_types.py`
- **Location**: `language/apply_types.py`
- **Usage**: `python3 ../../language/apply_types.py`
- **Function**: Scans the project (including `temprepo_cleaning`) and enforces semantic types and correct separators.

### 3. `compare_and_merge.py`
- **Location**: `manager/cleaner/compare_and_merge.py`
- **Usage**: `python3 manager/cleaner/compare_and_merge.py [--repo_dir <dir>] [--content_dir <dir>] [--dry-run]`
- **Function**: Scans ingested repositories and "Smart Merges" them into the `content/` directory.
- **Logic**:
    - **Identical**: Skipped.
    - **Substring**: Automatically updates target if source is a superset.
    - **Conflict**: Appends new source content with `<!-- MERGED FROM NEWER VERSION -->` separator.
    - **Metadata**: Unions lists and updates single values.

## Workflow Protocol
When asked to "Clean Repos" or "Import Data", follow this strict sequence:

1.  **Read Target**: Check `manager/cleaner/toclean_repolist.txt` for the URL.
2.  **Execute Ingestion**: Run `clean_repo.py` with the URL.
    - *Outcome*: Files populate in `temprepo_cleaning`.
3.  **Verify Structure**: Check a few files in `temprepo_cleaning` to ensure they have metadata blocks.
4.  **Enforce Schema**: Run `apply_types.py` to ensure all new files have the `<!-- content -->` separator and valid `type` field.
5.  **Smart Merge**: Run `compare_and_merge.py` (first with `--dry-run` to verify).
    - This will merge updates into `content/` and flag new files.
6.  **Refine Context**: Manually or heuristically review the ingested files to add **natural context dependencies**.
    - The automated scripts only insert defaults (e.g., `AGENTS.md`).
    - You must verify if an agent (e.g., `CONTROL_AGENT`) implements a specific guideline (e.g., `RL_GUIDELINES.md`) and add that dependency manually to the metadata: `"rl_guidelines": "RL_GUIDELINES.md"`.
7.  **Constraints & Exclusions**:
    - **Disregard** `AGENT_LOGS.md`: These are local execution logs and should not be merged.
    - **Disregard** `README.md`: These are repository-specific and should not overwrite the Knowledge Base entry point.
    - **Disregard** `TODOS.md` and other temporary artifacts.
8.  **Report**: Summarize the number of files imported and confirm their schema compliance.
9.  **Log**: Update `manager/cleaner/CLEANING_LOGS_LOG.md` with:
    - Date and Time
    - Repository URL and Branch
    - Number of files processed
    - Any errors or warnings (e.g., failed migrations)
    - Any manual modifications made to `clean_repo.py` or other scripts to enable the import.
10. **Cleanup**:
    - **Action**: Remove all contents of `manager/cleaner/temprepo_cleaning/` to ensure a clean state for the next run.
    - **Command**: `rm -rf manager/cleaner/temprepo_cleaning/*`
11. **Update Registry**:
    - **Action**: Scan the project to update `dependency_registry.json` with any new file relationships.
    - **Command**: `python3 src/dependency_manager.py scan`
12. **Global Log**:
    - **Action**: Update `content/agents/content/logs/AGENTS_LOG.md` with a new entry in the "Intervention History".
    - **Details**: Include Date, Action ("Cleaned Repos"), and a summary of files processed.
