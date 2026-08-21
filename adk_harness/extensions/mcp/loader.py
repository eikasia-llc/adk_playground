import os
from google.adk.tools import McpToolset
from mcp.client.stdio import StdioServerParameters

def get_mcp_toolsets() -> list[McpToolset]:
    """Load configured MCP servers as ADK toolsets.
    
    This function acts as the central registry for MCP servers used by the harness.
    Instantiate `McpToolset` objects here using `StdioServerParameters` for local processes
    or other connection types for remote servers.
    """
    toolsets = []
    
    # A self-contained local MCP server defined explicitly in this repository
    try:
        local_server_path = os.path.join(os.path.dirname(__file__), "local_server.py")
        time_params = StdioServerParameters(
            command="python",
            args=[local_server_path]
        )
        time_toolset = McpToolset(
            connection_params=time_params,
            tool_name_prefix="mcp_local_"
        )
        toolsets.append(time_toolset)
    except Exception as e:
        print(f"Warning: Failed to load local MCP server: {e}")

    return toolsets
