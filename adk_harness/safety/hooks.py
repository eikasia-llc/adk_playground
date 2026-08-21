"""Post-execution validation hooks.

This module provides the `after_tool_callback` mechanism for the harness, which runs
after a tool has executed but before the result is returned to the model.

This is the integration point for validators: schema checks, linting, or DB constraints.
By running them here, failures can be appended to the tool's output, allowing the LLM
to self-correct on the next turn.
"""

def after_tool_callback(tool, args: dict, result: str, tool_context) -> str:
    """Run validation logic on the tool output before returning it to the LLM.
    
    Args:
        tool: The tool that was executed.
        args: The arguments passed to the tool.
        result: The string result produced by the tool.
        tool_context: The execution context.
        
    Returns:
        The (potentially augmented or truncated) result string.
    """
    # Example: if tool.name == "write_file":
    #    run_linter(args["path"])
    #    if linter_failed:
    #        result += f"\\n\\nLINTER ERROR:\\n{linter_output}"
    return result
