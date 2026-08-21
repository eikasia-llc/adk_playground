---
name: example-time-management
description: Instructions and standard operating procedures for managing timezones and scheduling using the time MCP server. Call this skill when the user asks you to check the current time or schedule across different timezones.
---

# Time Management Skill

This is an example skill for the adk_harness demonstrating how to pair a skill with an MCP server.

When the user asks you to check the time or convert timezones, you have access to the `mcp-server-time` MCP server, which exposes tools prefixed with `mcp_time_`. 

## Standard Operating Procedure

1. If the user asks for the current time, use the `mcp_time_get_current_time` tool.
2. If the user asks to convert a time from one timezone to another, use the `mcp_time_convert_time` tool.
3. Always format the output clearly in 12-hour AM/PM format unless the user specifies otherwise.

Because you are using progressive disclosure, the LLM only sees the name and description of this skill during startup. It will use the `read_file` tool to load this exact document when the user's prompt triggers the description.
