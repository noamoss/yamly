# Architecture

This document describes the system architecture of yaml-diffs, including component relationships, design decisions, and extension points.

## Overview

yaml-diffs is a powerful YAML diffing service that supports both **generic YAML files** and **Hebrew legal documents**. The system provides:

- **Generic Mode**: Diff any YAML file (configs, K8s manifests, etc.) with path-based change tracking
- **Legal Document Mode**: Schema-validated diffing for Hebrew legal documents with marker-based section matching

The system is designed with a layered architecture that separates concerns and enables multiple interfaces.

## Architecture Layers

The system is organized into four main layers:

```
┌─────────────────────────────────────────┐
│      Interface Layer                    │
│  (CLI, Library API, REST API, MCP)     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Core Logic Layer                   │
│  (Diff Engine, Formatters)              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Data Layer                         │
│  (Loader, Validator)                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Model Layer                        │
│  (Pydantic Models, OpenSpec Schema)     │
└─────────────────────────────────────────┘
```

### Interface Layer

The interface layer provides multiple ways to interact with the system:

- **CLI Tool** (`yaml-diffs` command) - Command-line interface for quick operations
- **Library API** (`yaml_diffs` package) - Python library for programmatic use
- **REST API** (FastAPI server) - HTTP endpoints for remote access
- **MCP Server** - Model Context Protocol server for AI assistants

**Key Components:**
- `src/yamly/cli/` - CLI implementation
- `src/yamly/api.py` - Main library API
- `src/yamly/api_server/` - REST API server
- `src/yamly/mcp_server/` - MCP server

### Core Logic Layer

The core logic layer implements the main business logic:

- **Mode Router** - Detects document type and routes to appropriate diff engine
- **Generic Diff Engine** - Path-based diffing for any YAML file
- **Legal Document Diff Engine** - Marker-based diffing for legal documents
- **Formatters** - Output formatting (JSON, text, YAML)

**Key Components:**
- `src/yamly/diff_router.py` - Mode detection and routing
- `src/yamly/generic_diff.py` - Generic YAML diff engine
- `src/yamly/generic_diff_types.py` - Generic diff types
- `src/yamly/diff.py` - Legal document diff engine
- `src/yamly/diff_types.py` - Legal document diff types
- `src/yamly/formatters/` - Formatter implementations

### Data Layer

The data layer handles data loading and validation:

- **YAML Loader** - Loads and parses YAML files with UTF-8 support
- **Validator** - Validates documents against OpenSpec schema and Pydantic models

**Key Components:**
- `src/yamly/loader.py` - YAML loading utilities
- `src/yamly/validator.py` - Validation logic

### Model Layer

The model layer defines the data structures:

- **Pydantic Models** - Python runtime validation models
- **OpenSpec Schema** - Language-agnostic contract definition

**Key Components:**
- `src/yamly/models/` - Pydantic models (Document, Section)
- `src/yamly/schema/legal_document_spec.yaml` - OpenSpec schema

## Component Relationships

```mermaid
graph TB
    subgraph "Interface Layer"
        CLI[CLI Tool]
        LIB[Library API]
        REST[REST API]
        MCP[MCP Server]
    end

    subgraph "Core Logic Layer"
        DIFF[Diff Engine]
        FORMAT[Formatters]
    end

    subgraph "Data Layer"
        LOADER[YAML Loader]
        VALIDATOR[Validator]
    end

    subgraph "Model Layer"
        MODELS[Pydantic Models]
        SCHEMA[OpenSpec Schema]
    end

    CLI --> LIB
    REST --> LIB
    MCP --> REST
    LIB --> DIFF
    LIB --> FORMAT
    LIB --> LOADER
    LIB --> VALIDATOR
    DIFF --> MODELS
    FORMAT --> MODELS
    LOADER --> MODELS
    VALIDATOR --> MODELS
    VALIDATOR --> SCHEMA
    MODELS --> SCHEMA
```

## Data Flow

### Document Loading Flow

```
YAML File
    ↓
YAML Loader (UTF-8 parsing)
    ↓
Raw Python Dict
    ↓
Pydantic Validation
    ↓
Document Model
```

### Document Diffing Flow

```
Old YAML + New YAML
    ↓
Mode Detection (diff_router.py)
    ↓
┌──────────────────────────────────┐
│ Generic Mode      │ Legal Mode   │
│ (general)         │ (legal_doc)  │
├───────────────────┼──────────────┤
│ Path-based        │ Marker-based │
│ generic_diff.py   │ diff.py      │
└───────────────────┴──────────────┘
    ↓
Change Detection
    ↓
GenericDiffResult or DiffResult Objects
    ↓
Formatter (JSON/Text/YAML)
    ↓
Formatted Output
```

### Generic Diff Algorithm (3-Phase)

The generic diff algorithm works in three phases:

1. **Recursive Local Diff**: Compare nodes at same paths, detect VALUE_CHANGED, KEY_ADDED/REMOVED, ITEM_ADDED/REMOVED, and collect unmatched items for global matching
2. **Rename Detection**: Match removed+added keys with similar values at same parent, convert to KEY_RENAMED
3. **Global Move Detection**: Match remaining removed vs added globally by identity/content, convert to KEY_MOVED / ITEM_MOVED

For detailed algorithm documentation with workflow diagrams, see [Diffing Algorithms](diffing_algorithms.md).

### Validation Flow

```
YAML File
    ↓
YAML Loader
    ↓
OpenSpec Validation
    ↓
Pydantic Validation
    ↓
Validated Document
```

## Key Design Decisions

### 1. Dual Mode Operation

**Decision:** Support both generic YAML and legal document diffing.

**Rationale:**
- Generic mode works with any YAML file (configs, K8s manifests, etc.)
- Legal document mode provides specialized handling for Hebrew legal documents
- Auto-detection routes to appropriate engine based on structure
- Users can explicitly specify mode when needed

**Trade-off:** More code to maintain, but significantly broader use case coverage.

### 2. Marker-Based Diffing (Legal Document Mode)

**Decision:** Use markers (not IDs) as primary identifiers for diffing.

**Rationale:**
- Markers are semantic identifiers (e.g., "1", "א", "(a)")
- IDs are stable but not semantic
- Markers enable human-readable diff results
- Supports Hebrew legal document conventions

**Trade-off:** Requires marker uniqueness validation at each nesting level.

### 3. Identity Rules (Generic Mode)

**Decision:** Support configurable identity rules for array item matching.

**Rationale:**
- Auto-detection of common fields (`id`, `name`, `key`) covers most cases
- Custom rules allow handling of domain-specific identifiers
- Conditional rules support polymorphic arrays
- Fallback to content similarity when no identity available

**Trade-off:** Requires user configuration for complex structures.

### 2. Dual Validation System

**Decision:** Validate against both OpenSpec schema and Pydantic models.

**Rationale:**
- OpenSpec provides language-agnostic contract
- Pydantic provides Python runtime validation
- Dual validation ensures consistency across implementations
- OpenSpec can be used by non-Python implementations

**Trade-off:** Slightly slower validation, but ensures correctness.

### 3. Recursive Section Structure

**Decision:** Use recursive sections with unlimited nesting depth.

**Rationale:**
- Legal documents have deeply nested structures
- Recursive structure is natural for legal documents
- No artificial depth limits
- Flexible for various document types

**Trade-off:** Requires careful handling of deep recursion in algorithms.

### 4. Multiple Interface Layers

**Decision:** Provide CLI, library, REST API, and MCP server interfaces.

**Rationale:**
- Different use cases require different interfaces
- CLI for quick operations
- Library for programmatic use
- REST API for remote access
- MCP server for AI assistants

**Trade-off:** More code to maintain, but better usability.

### 5. UTF-8 Hebrew Support

**Decision:** Full UTF-8 support for Hebrew content throughout.

**Rationale:**
- Target use case is Hebrew legal documents
- UTF-8 is standard encoding
- Proper handling of RTL text
- Support for Hebrew markers and content

**Trade-off:** Requires careful encoding handling in all components.

## Extension Points

### Adding a New Formatter

1. Create a new formatter class in `src/yamly/formatters/`
2. Implement the formatter interface
3. Register in `src/yamly/formatters/__init__.py`
4. Add to `format_diff()` function

### Adding a New Interface

1. Create interface module (e.g., `src/yamly/graphql_server/`)
2. Use the library API (`yaml_diffs.api`) for core functionality
3. Add interface-specific logic
4. Document in appropriate documentation section

### Extending the Schema

1. Update `src/yamly/schema/legal_document_spec.yaml`
2. Update Pydantic models in `src/yamly/models/`
3. Update validation logic in `src/yamly/validator.py`
4. Update tests
5. Update documentation

### Adding New Diff Change Types

**For Legal Document Mode:**
1. Add to `ChangeType` enum in `src/yamly/diff_types.py`
2. Update diff engine logic in `src/yamly/diff.py`
3. Update formatters to handle new type
4. Update tests
5. Update documentation

**For Generic Mode:**
1. Add to `GenericChangeType` enum in `src/yamly/generic_diff_types.py`
2. Update diff engine logic in `src/yamly/generic_diff.py`
3. Update UI to handle new type (`GenericChangeCard.tsx`, `DiffSummary.tsx`)
4. Update tests
5. Update documentation

## File Organization

```
src/yamly/
├── __init__.py              # Package exports
├── api.py                   # Main library API
├── loader.py                # YAML loading
├── validator.py             # Validation logic
├── diff_router.py           # Mode detection and routing
├── diff.py                  # Legal document diff engine
├── diff_types.py            # Legal document diff types
├── generic_diff.py          # Generic YAML diff engine
├── generic_diff_types.py    # Generic diff types
├── exceptions.py            # Custom exceptions
├── models/                  # Pydantic models
│   ├── document.py
│   └── section.py
├── schema/                  # OpenSpec schema
│   └── legal_document_spec.yaml
├── formatters/              # Output formatters
│   ├── json_formatter.py
│   ├── text_formatter.py
│   └── yaml_formatter.py
├── cli/                     # CLI tool
│   ├── main.py
│   └── commands.py
├── api_server/              # REST API
│   ├── main.py
│   └── routers/
└── mcp_server/              # MCP server
    ├── server.py
    └── tools.py
```

## Testing Architecture

The test suite is organized to match the code structure:

```
tests/
├── test_models.py           # Model tests
├── test_loader.py           # Loader tests
├── test_validator.py        # Validator tests
├── test_diff.py             # Legal document diff tests
├── test_generic_diff.py     # Generic YAML diff tests
├── test_diff_router.py      # Mode detection tests
├── test_formatters.py       # Formatter tests
├── test_api.py              # Library API tests
├── test_cli.py              # CLI tests
└── test_api_server.py       # REST API tests
```

## Performance Considerations

### Document Loading

- YAML parsing is done with `pyyaml` (C extension for speed)
- UTF-8 encoding is handled efficiently
- Large documents are loaded incrementally

### Diff Algorithm

- Marker-based matching is O(n) for same structure
- Content similarity uses efficient string comparison
- Deep nesting is handled recursively

### Validation

- OpenSpec validation happens first (faster failure)
- Pydantic validation provides detailed errors
- Validation can be skipped if document is already validated

## Security Considerations

### Input Validation

- All inputs are validated against schemas
- YAML parsing uses `safe_load()` to prevent code execution
- File paths are sanitized to prevent directory traversal

### Error Handling

- Errors don't expose internal details
- Validation errors provide actionable messages
- Custom exceptions for clear error handling

## Related Documentation

- [Contributing Guide](contributing.md) - How to contribute
- [API Reference](api_reference.md) - Complete API documentation
- [Schema Reference](../user/schema_reference.md) - Schema documentation
- [AGENTS.md](../../AGENTS.md) - AI agent development guide
