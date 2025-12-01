"""MCP server for yamly API endpoints.

This package provides an MCP (Model Context Protocol) server that exposes
the REST API endpoints as MCP tools, enabling AI assistants to interact
with the yamly service via the MCP protocol.
"""

from yamly.mcp_server.config import MCPServerConfig
from yamly.mcp_server.server import run_server

__all__ = ["MCPServerConfig", "run_server"]
