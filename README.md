# yamly

A powerful YAML diffing service that supports both **generic YAML files** and **Hebrew legal documents**.

## Overview

**yamly** provides a comprehensive solution for comparing YAML documents, offering:

- **Dual Mode Support**:
  - **Generic Mode**: Diff any YAML file (configs, Kubernetes manifests, etc.) with path-based tracking
  - **Legal Document Mode**: Schema-validated diffing for Hebrew legal documents with marker-based section matching
- **Smart Array Matching**: Auto-detects identity fields (`id`, `name`, `key`) or use custom rules
- **Complete Change Detection**: VALUE_CHANGED, KEY_ADDED, KEY_REMOVED, KEY_RENAMED, KEY_MOVED, ITEM_ADDED, ITEM_REMOVED, ITEM_MOVED, TYPE_CHANGED
- **Multiple Interfaces**: Python library, CLI tool, REST API (FastAPI), MCP Server, and Web UI (Next.js)
- **Deployment**: Railway-hosted REST API service

## Key Features

### Generic YAML Mode
- **Any YAML Works**: No schema required - compare any valid YAML files
- **Path-Based Tracking**: Changes tracked by their path in the document (e.g., `spec.replicas`, `database.host`)
- **Identity Rules**: Define how array items are matched (by `name`, `id`, or custom fields)
- **Conditional Rules**: Different identity fields for different item types (e.g., books by `catalog_id`, videos by `media_id`)

### Legal Document Mode
- **Schema Validation**: OpenSpec/Pydantic validation for legal document structure
- **Marker-Based Diffing**: Sections matched by markers (not IDs) for reliable diffing across versions
- **Hebrew Support**: Full UTF-8 support for Hebrew legal text throughout
- **Recursive Structure**: Unlimited nesting depth for document sections

## CI/CD Status

[![Tests](https://github.com/noamoss/yamly/actions/workflows/test.yml/badge.svg)](https://github.com/noamoss/yamly/actions/workflows/test.yml)
[![Lint](https://github.com/noamoss/yamly/actions/workflows/lint.yml/badge.svg)](https://github.com/noamoss/yamly/actions/workflows/lint.yml)
[![Build](https://github.com/noamoss/yamly/actions/workflows/build.yml/badge.svg)](https://github.com/noamoss/yamly/actions/workflows/build.yml)

## Installation

### Prerequisites

- Python 3.10 or higher (required for MCP server support)
- uv (install via: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/noamoss/yamly.git
cd yaml_diffs

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install in development mode
uv sync --extra dev

# Install pre-commit hooks
pre-commit install
```

### Environment Configuration

For local development, you can configure environment variables using a `.env` file:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings (optional)
# The .env file includes the production API URL by default
```

The `.env.example` file includes:
- **API Server Configuration**: PORT, HOST, LOG_LEVEL, etc.
- **CORS Configuration**: CORS_ORIGINS, CORS_ALLOW_CREDENTIALS, etc.
- **API Client Configuration**: `YAML_DIFFS_API_URL` (set in `.env` file, defaults to `http://localhost:8000` in code)

**Note**: The `.env` file is for local development only. Railway deployments use environment variables set in the Railway dashboard.

## Project Structure

```
yamly/
├── src/
│   └── yaml_diffs/          # Main package
│       ├── __init__.py
│       ├── api.py           # Main library API
│       ├── loader.py        # YAML loading utilities
│       ├── validator.py     # Validation logic
│       ├── diff.py          # Document diffing engine
│       ├── models/          # Pydantic models
│       ├── schema/          # OpenSpec schema
│       ├── formatters/      # Diff output formatters
│       ├── cli/             # CLI tool
│       ├── api_server/      # FastAPI REST API
│       └── mcp_server/      # MCP server for AI assistants
├── ui/                      # Next.js Web UI
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and API client
│   ├── stores/              # Zustand state management
│   └── package.json         # Node.js dependencies
├── tests/                   # Test suite
├── examples/                # Example YAML documents
│   ├── minimal_document.yaml
│   ├── complex_document.yaml
│   ├── document_v1.yaml
│   ├── document_v2.yaml
│   └── template.yaml
├── docs/                    # Documentation
│   ├── user/                # User-facing documentation
│   ├── developer/           # Developer documentation
│   ├── api/                 # API documentation
│   └── operations/          # Operations documentation
├── pyproject.toml           # Project configuration
└── README.md               # This file
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/yamly --cov-report=html

# Run specific test file
pytest tests/test_models.py

# Run tests in watch mode
pytest-watch
```

### Code Quality

```bash
# Linting
ruff check src/ tests/

# Format code
ruff format src/ tests/

# Type checking
mypy src/
```

### Building

```bash
# Build package
python -m build

# Install from built package
uv pip install dist/yaml_diffs-*.whl
```

## Quick Start

### Python Library

```python
from yaml_diffs import load_document, diff_documents, format_diff

# Load a document
doc = load_document("examples/minimal_document.yaml")
print(f"Document: {doc.title}")

# Diff two documents
old_doc = load_document("examples/document_v1.yaml")
new_doc = load_document("examples/document_v2.yaml")
diff = diff_documents(old_doc, new_doc)

# Format the results
json_output = format_diff(diff, output_format="json")
print(json_output)
```

### CLI

```bash
# Validate a legal document
yamly validate examples/minimal_document.yaml

# Auto-detect mode and diff two documents
yamly diff examples/document_v1.yaml examples/document_v2.yaml

# Force generic YAML mode (any YAML file)
yamly diff config_v1.yaml config_v2.yaml --mode general

# Generic diff with identity rules (match containers by name)
yamly diff old.yaml new.yaml --mode general --identity-rule "containers:name"

# Conditional identity rule (books by catalog_id when type=book)
yamly diff old.yaml new.yaml --identity-rule "inventory:catalog_id:type=book"

# Force legal document mode
yamly diff old.yaml new.yaml --mode legal_document

# Diff with text output
yamly diff old.yaml new.yaml --format text

# Save diff to file
yamly diff old.yaml new.yaml --output diff.json
```

### REST API

**Local Development:**

**Quick Start (Recommended):**
```bash
# Start both backend and frontend servers
./scripts/dev.sh

# Stop all servers
./scripts/dev-stop.sh
```

This will start:
- Backend API server at http://localhost:8000
- Frontend UI at http://localhost:3000
- API documentation at http://localhost:8000/docs

**Manual Start (Alternative):**
```bash
# Start API server only
uvicorn src.yamly.api_server.main:app --reload --port 8000

# Validate a document
curl -X POST http://localhost:8000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"yaml": "document:\n  id: \"test\"\n  ..."}'

# Diff two documents (auto-detect mode)
curl -X POST http://localhost:8000/api/v1/diff \
  -H "Content-Type: application/json" \
  -d '{"old_yaml": "...", "new_yaml": "..."}'

# Diff with explicit mode and identity rules
curl -X POST http://localhost:8000/api/v1/diff \
  -H "Content-Type: application/json" \
  -d '{
    "old_yaml": "...",
    "new_yaml": "...",
    "mode": "general",
    "identity_rules": [
      {"array": "containers", "identity_field": "name"}
    ]
  }'

# Health check
curl http://localhost:8000/health
```

**Production API:**
The production API URL is configured via the `YAML_DIFFS_API_URL` environment variable. Set this in your `.env` file or environment:

```bash
# Set API URL in .env file
YAML_DIFFS_API_URL=https://api-yamly.thepitz.studio

# Health check
curl $YAML_DIFFS_API_URL/health

# Validate a document
curl -X POST $YAML_DIFFS_API_URL/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"yaml": "document:\n  id: \"test\"\n  ..."}'
```

The API also provides interactive documentation:
- **Local**: http://localhost:8000/docs (Swagger UI) and http://localhost:8000/redoc (ReDoc)
- **Production**: `$YAML_DIFFS_API_URL/docs` and `$YAML_DIFFS_API_URL/redoc` (use your configured API URL)

### MCP Server

The MCP (Model Context Protocol) server exposes the REST API endpoints as MCP tools, enabling AI assistants to interact with the yamly service.

**Quick Start:**

```bash
# Run MCP server (connects to local API by default)
yamly mcp-server

# Or with custom configuration
yamly mcp-server --api-url http://api.example.com:8000 --api-key your-key
```

**Available Tools:**
- `validate_document`: Validate a YAML document
- `diff_documents`: Compare two YAML documents
- `health_check`: Check API health status

**Configuration:**
- `YAML_DIFFS_API_URL`: API base URL (default: `http://localhost:8000`, or from `.env` file)
- `YAML_DIFFS_API_KEY`: Optional API key for authentication (can be set in `.env` file)
- `YAML_DIFFS_API_TIMEOUT`: Request timeout in seconds (default: `30`, can be set in `.env` file)

These can be configured via environment variables or in a `.env` file (see [Environment Configuration](#environment-configuration)).

For detailed MCP server documentation, see [docs/api/mcp_server.md](docs/api/mcp_server.md).

### Web UI

The Web UI provides a GitHub PR-style interface for viewing and commenting on YAML document diffs. Built with Next.js, it offers an intuitive way to compare document versions and discuss changes.

**Quick Start:**

The easiest way to start both backend and frontend together:
```bash
# Start both servers (from project root)
./scripts/dev.sh

# Stop both servers
./scripts/dev-stop.sh
```

**Manual Start (Alternative):**
```bash
# Navigate to UI directory
cd ui

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The UI will be available at http://localhost:3000 by default.

**Features:**
- GitHub PR-style diff viewer with change cards
- CodeMirror YAML editor with syntax highlighting and RTL support
- Threaded discussions attached to individual changes
- Character-level diff highlighting
- JSON export of diff results and discussions

**Configuration:**
- `NEXT_PUBLIC_API_URL`: Railway API URL (default: `http://localhost:8000`)

For detailed UI setup, deployment, and configuration instructions, see [ui/README.md](ui/README.md).

### Deployment

The REST API can be deployed to Railway with minimal configuration.

**Quick Start:**

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Python project and deploy
3. Configure environment variables in Railway dashboard (see [Deployment Guide](docs/operations/deployment.md))
4. Your API will be available at the Railway-provided URL

**Key Features:**
- Automatic deployments on push to `main` branch
- Health check monitoring via `/health` endpoint
- Environment variable configuration via Railway dashboard
- Production-ready with proper port binding and CORS support

For detailed deployment instructions, troubleshooting, and production best practices, see the [Railway Deployment Guide](docs/operations/deployment.md).

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Getting Started](docs/user/getting_started.md)** - Quick start guide with installation and basic usage
- **[Schema Reference](docs/user/schema_reference.md)** - Complete OpenSpec schema documentation
- **[Examples Guide](docs/user/examples.md)** - How to use example documents and templates
- **[API Reference](docs/developer/api_reference.md)** - Complete Python library API reference
- **[Architecture](docs/developer/architecture.md)** - System architecture and design decisions
- **[Contributing](docs/developer/contributing.md)** - How to contribute to the project
- **[REST API](docs/api/api_server.md)** - REST API documentation
- **[MCP Server](docs/api/mcp_server.md)** - MCP server for AI assistants
- **[Deployment](docs/operations/deployment.md)** - Railway deployment guide
- **[CI/CD](docs/operations/ci_cd.md)** - Continuous integration and deployment workflows

See the [Documentation Index](docs/README.md) for a complete overview.

## Contributing

We welcome contributions! Please see our [Contributing Guide](docs/developer/contributing.md) for details.

**Quick Start:**
1. Create a feature branch from `main`
2. Write tests first (TDD approach)
3. Implement feature following code style
4. Ensure all tests pass (`pytest`, `ruff check`, `mypy`)
5. Update documentation if needed
6. Create pull request

For AI coding agents, see [AGENTS.md](AGENTS.md) for specific guidelines.

## License

MIT License

## Examples

The `examples/` directory contains example documents:

- **`minimal_document.yaml`** - Minimal valid document with all required fields
- **`complex_document.yaml`** - Complex document with deep nesting (5+ levels)
- **`document_v1.yaml`** and **`document_v2.yaml`** - Example versions for diffing
- **`template.yaml`** - Template for creating new documents

See the [Examples Guide](docs/user/examples.md) and [Examples README](examples/README.md) for details.

## References

- **OpenSpec**: Schema definition standard
- **Pydantic**: Python data validation library
- **FastAPI**: Modern Python web framework
- **Railway**: Deployment platform
- **GitHub Actions**: CI/CD workflow automation

## Project Status

This project is in active development. See [GitHub Issues](https://github.com/noamoss/yamly/issues) for current tasks and progress.

## Getting Help

- **Documentation**: [Documentation Index](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/noamoss/yamly/issues)
- **Project Board**: [GitHub Project Board](https://github.com/users/noamoss/projects/4)
