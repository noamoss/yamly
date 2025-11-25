"""HTTP client for communicating with yaml-diffs API.

Provides a simple interface for calling the REST API endpoints.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from yaml_diffs.mcp_server.config import MCPServerConfig

logger = logging.getLogger(__name__)


class APIClient:
    """HTTP client for yaml-diffs API.

    Handles HTTP communication with the REST API, including error handling
    and optional authentication.

    Attributes:
        config: MCP server configuration.
    """

    def __init__(self, config: MCPServerConfig) -> None:
        """Initialize API client with configuration.

        Args:
            config: MCP server configuration.
        """
        self.config = config
        self._client = httpx.Client(
            base_url=config.api_base_url,
            timeout=config.timeout,
            headers=self._get_headers(),
        )

    def _get_headers(self) -> dict[str, str]:
        """Get HTTP headers including optional authentication.

        Returns:
            Dictionary of HTTP headers.
        """
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    def validate_document(self, yaml: str) -> dict[str, Any]:
        """Validate a YAML document.

        Args:
            yaml: YAML content as string.

        Returns:
            Dictionary containing validation result.

        Raises:
            httpx.HTTPStatusError: If API request fails.
            httpx.RequestError: If network error occurs.
        """
        try:
            response = self._client.post(
                "/api/v1/validate",
                json={"yaml": yaml},
            )
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            return result
        except httpx.HTTPStatusError as e:
            logger.error(f"API error validating document: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error validating document: {e}")
            raise

    def diff_documents(self, old_yaml: str, new_yaml: str) -> dict[str, Any]:
        """Diff two YAML documents.

        Args:
            old_yaml: Old document version YAML content as string.
            new_yaml: New document version YAML content as string.

        Returns:
            Dictionary containing diff result.

        Raises:
            httpx.HTTPStatusError: If API request fails.
            httpx.RequestError: If network error occurs.
        """
        try:
            response = self._client.post(
                "/api/v1/diff",
                json={"old_yaml": old_yaml, "new_yaml": new_yaml},
            )
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            return result
        except httpx.HTTPStatusError as e:
            logger.error(f"API error diffing documents: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error diffing documents: {e}")
            raise

    def health_check(self) -> dict[str, Any]:
        """Check API health status.

        Returns:
            Dictionary containing health status.

        Raises:
            httpx.HTTPStatusError: If API request fails.
            httpx.RequestError: If network error occurs.
        """
        try:
            response = self._client.get("/health")
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            return result
        except httpx.HTTPStatusError as e:
            logger.error(f"API error checking health: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error checking health: {e}")
            raise

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> APIClient:
        """Context manager entry."""
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
        self.close()
