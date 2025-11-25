"""Unit tests for MCP server components.

Tests configuration, client, and server initialization.
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import httpx
import pytest

from yaml_diffs.mcp_server.client import APIClient
from yaml_diffs.mcp_server.config import MCPServerConfig


class TestMCPServerConfig:
    """Tests for MCPServerConfig."""

    def test_default_config(self) -> None:
        """Test default configuration values."""
        config = MCPServerConfig()
        assert config.api_base_url == "http://localhost:8000"
        assert config.api_key is None
        assert config.timeout == 30

    def test_config_from_parameters(self) -> None:
        """Test configuration from parameters."""
        config = MCPServerConfig(
            api_base_url="http://api.example.com:9000",
            api_key="test-key",
            timeout=60,
        )
        assert config.api_base_url == "http://api.example.com:9000"
        assert config.api_key == "test-key"
        assert config.timeout == 60

    def test_config_from_env_vars(self) -> None:
        """Test configuration from environment variables."""
        with patch.dict(
            os.environ,
            {
                "YAML_DIFFS_API_URL": "http://env.example.com:8000",
                "YAML_DIFFS_API_KEY": "env-key",
                "YAML_DIFFS_API_TIMEOUT": "45",
            },
        ):
            config = MCPServerConfig()
            assert config.api_base_url == "http://env.example.com:8000"
            assert config.api_key == "env-key"
            assert config.timeout == 45

    def test_config_env_override_parameters(self) -> None:
        """Test that parameters override environment variables."""
        with patch.dict(
            os.environ,
            {
                "YAML_DIFFS_API_URL": "http://env.example.com:8000",
                "YAML_DIFFS_API_KEY": "env-key",
            },
        ):
            config = MCPServerConfig(
                api_base_url="http://param.example.com:9000",
                api_key="param-key",
            )
            assert config.api_base_url == "http://param.example.com:9000"
            assert config.api_key == "param-key"

    def test_config_invalid_timeout(self) -> None:
        """Test configuration with invalid timeout value."""
        with patch.dict(os.environ, {"YAML_DIFFS_API_TIMEOUT": "invalid"}):
            config = MCPServerConfig()
            assert config.timeout == 30  # Should use default

    def test_config_timeout_zero(self) -> None:
        """Test that timeout=0 is handled correctly (not treated as falsy)."""
        config = MCPServerConfig(timeout=0)
        assert config.timeout == 0  # Should preserve 0, not use default

    def test_config_timeout_zero_with_env(self) -> None:
        """Test that timeout=0 parameter overrides environment variable."""
        with patch.dict(os.environ, {"YAML_DIFFS_API_TIMEOUT": "45"}):
            config = MCPServerConfig(timeout=0)
            assert config.timeout == 0  # Should use parameter, not env var

    def test_config_url_trailing_slash_removed(self) -> None:
        """Test that trailing slashes are removed from API URL."""
        config = MCPServerConfig(api_base_url="http://example.com/")
        assert config.api_base_url == "http://example.com"

    def test_config_repr(self) -> None:
        """Test string representation of configuration."""
        config = MCPServerConfig(api_key="secret-key")
        repr_str = repr(config)
        assert "MCPServerConfig" in repr_str
        assert "api_base_url" in repr_str
        assert "secret-key" not in repr_str  # Should be masked
        assert "***" in repr_str


class TestAPIClient:
    """Tests for APIClient."""

    def test_client_initialization(self) -> None:
        """Test API client initialization."""
        config = MCPServerConfig()
        client = APIClient(config)
        assert client.config == config
        assert client._client.base_url == config.api_base_url
        client.close()

    def test_client_headers_without_auth(self) -> None:
        """Test HTTP headers without authentication."""
        config = MCPServerConfig()
        client = APIClient(config)
        headers = client._get_headers()
        assert headers["Content-Type"] == "application/json"
        assert "Authorization" not in headers
        client.close()

    def test_client_headers_with_auth(self) -> None:
        """Test HTTP headers with authentication."""
        config = MCPServerConfig(api_key="test-key")
        client = APIClient(config)
        headers = client._get_headers()
        assert headers["Content-Type"] == "application/json"
        assert headers["Authorization"] == "Bearer test-key"
        client.close()

    @patch("yaml_diffs.mcp_server.client.httpx.Client")
    def test_validate_document_success(self, mock_client_class: MagicMock) -> None:
        """Test successful document validation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"valid": True, "document": {"id": "test"}}
        mock_response.raise_for_status.return_value = None

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        config = MCPServerConfig()
        client = APIClient(config)
        result = client.validate_document("document: id: test")

        assert result == {"valid": True, "document": {"id": "test"}}
        mock_client.post.assert_called_once_with(
            "/api/v1/validate",
            json={"yaml": "document: id: test"},
        )
        client.close()

    @patch("yaml_diffs.mcp_server.client.httpx.Client")
    def test_validate_document_error(self, mock_client_class: MagicMock) -> None:
        """Test document validation with API error."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Bad Request", request=MagicMock(), response=mock_response
        )

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        config = MCPServerConfig()
        client = APIClient(config)

        with pytest.raises(httpx.HTTPStatusError):
            client.validate_document("invalid yaml")

        client.close()

    @patch("yaml_diffs.mcp_server.client.httpx.Client")
    def test_diff_documents_success(self, mock_client_class: MagicMock) -> None:
        """Test successful document diffing."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"diff": {"changes": []}}
        mock_response.raise_for_status.return_value = None

        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        config = MCPServerConfig()
        client = APIClient(config)
        result = client.diff_documents("old: yaml", "new: yaml")

        assert result == {"diff": {"changes": []}}
        mock_client.post.assert_called_once_with(
            "/api/v1/diff",
            json={"old_yaml": "old: yaml", "new_yaml": "new: yaml"},
        )
        client.close()

    @patch("yaml_diffs.mcp_server.client.httpx.Client")
    def test_health_check_success(self, mock_client_class: MagicMock) -> None:
        """Test successful health check."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "healthy", "version": "0.1.0"}
        mock_response.raise_for_status.return_value = None

        mock_client = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        config = MCPServerConfig()
        client = APIClient(config)
        result = client.health_check()

        assert result == {"status": "healthy", "version": "0.1.0"}
        mock_client.get.assert_called_once_with("/health")
        client.close()

    def test_client_context_manager(self) -> None:
        """Test API client as context manager."""
        config = MCPServerConfig()
        with APIClient(config) as client:
            assert client.config == config
        # Client should be closed after context exit
        assert client._client.is_closed
