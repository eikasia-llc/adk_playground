from datetime import datetime
from typing import Annotated
from pydantic import Field
from mcp.server.fastmcp import FastMCP

# Server Name: {service}_mcp
mcp = FastMCP("local_mcp")

@mcp.tool(
    name="local_get_time",
    annotations={
        "title": "Get Local Time",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False
    }
)
def local_get_time(
    timezone: Annotated[str, Field(description="The timezone to get the time for (e.g. UTC, EST).")] = "UTC"
) -> str:
    """Get the current local time from the self-contained harness server.
    
    Args:
        timezone: The timezone to get the time for.
        
    Returns:
        str: JSON-formatted response containing the current time in ISO-8601 format.
    """
    # Dummy implementation that just returns current UTC time ignoring the timezone
    return f'{{"timezone": "{timezone}", "time": "{datetime.now().isoformat()}"}}'

if __name__ == "__main__":
    # Start the server on stdin/stdout
    mcp.run()
