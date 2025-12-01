# Schema Reference

This document provides a comprehensive reference for the OpenSpec schema used by yamly. The schema defines the structure for Hebrew legal and regulatory documents in YAML format.

## Overview

The yamly schema is defined using OpenSpec (JSON Schema Draft 2020-12) and supports:

- **Recursive sections** with unlimited nesting depth
- **Flexible structural markers** (e.g., "1", "א", "(a)", "Chapter I")
- **Hebrew content** with full UTF-8 support
- **Stable IDs** for reliable change tracking
- **Version information** for document versioning

The schema file is located at: `src/yamly/schema/legal_document_spec.yaml`

## Document Structure

A valid document must have the following top-level structure:

```yaml
document:
  id: string              # Optional (Recommended): Stable document identifier
  title: string           # Optional (Recommended): Document title in Hebrew
  type: string            # Optional (Recommended): Document type (law, regulation, etc.)
  language: string        # Optional (Recommended): Must be "hebrew"
  version: object         # Optional (Recommended): Version information
  source: object          # Optional (Recommended): Source information
  sections: array         # Required: Array of sections (can be empty)
  authors: array          # Optional: List of authors
  published_date: string  # Optional: Publication date (ISO 8601)
  updated_date: string    # Optional: Last update date (ISO 8601)
```

## Document Fields

### Required Fields

#### `sections` (array)

Array of section objects. Can be empty. Each section follows the recursive Section schema (see below).

**Example:**
```yaml
sections:
  - id: "sec-1"
    marker: "1"
    title: "הגדרות"
    content: "תוכן הסעיף"
    sections: []
```

### Recommended Fields (Optional)

The following fields are **optional but recommended** for better document organization, tracking, and management. The core diffing functionality only requires the `sections` array, but these metadata fields enhance the document's usefulness.

#### `id` (string, optional)

Stable document identifier for tracking and reference (recommended: UUID or canonical ID). Enables stable document identification across systems and versions. Useful for database storage, API references, and cross-referencing.

**Recommended formats:**
- UUID: `"550e8400-e29b-41d4-a716-446655440000"`
- Canonical ID: `"law-1234"`

**Example:**
```yaml
id: "law-1234"
```

#### `title` (string, optional)

Document title for human readability (recommended for documentation). Improves human readability and document organization. Essential for UI display and document management.

**Example:**
```yaml
title: "חוק הדוגמה לרגולציה"
```

#### `type` (string, optional)

Document type classification (recommended for organization and filtering). Enables document categorization and filtering. Useful for organizing large document collections. Accepts any string value (free text).

**Common examples:**
- `"law"` - Law
- `"regulation"` - Regulation
- `"directive"` - Directive
- `"circular"` - Circular
- `"policy"` - Policy
- `"other"` - Other
- `"custom-type"` - Any custom string value

**Example:**
```yaml
type: "law"
# or any custom value:
type: "custom-document-type"
```

#### `language` (string, optional)

Document language specification (recommended for multi-language support). Specifies document language for proper rendering and processing. Important for multi-language systems.

**Must be `"hebrew"` if provided.**

**Example:**
```yaml
language: "hebrew"
```

#### `version` (object, optional)

Document version information (recommended for version control). Tracks document version history. Essential for version control and change tracking workflows.

**Fields:**
- `number` (string, optional): Version identifier for tracking document versions (recommended for version control). Version identifier or date (e.g., `"2024-01-01"` or `"v1.0"`)
- `description` (string, optional): Version description

**Example:**
```yaml
version:
  number: "2024-01-01"
  description: "גרסה ראשונית"
```

#### `source` (object, optional)

Document source information (recommended for traceability). Provides provenance and attribution. Important for legal compliance and audit trails.

**Fields:**
- `url` (string, optional): Source URL for provenance and attribution (recommended for traceability). Original source URL (must be valid URI if provided)
- `fetched_at` (string, optional): Timestamp when document was retrieved (recommended for audit trails). ISO 8601 timestamp when document was fetched

**Example:**
```yaml
source:
  url: "https://example.gov.il/law1234"
  fetched_at: "2025-01-20T09:50:00Z"
```

### Optional Fields

#### `authors` (array of strings)

List of authors, entities, or organizations.

**Example:**
```yaml
authors:
  - "הכנסת"
  - "משרד המשפטים"
```

#### `published_date` (string)

Publication date in ISO 8601 format.

**Example:**
```yaml
published_date: "1992-03-17"
# or
published_date: "1992-03-17T00:00:00Z"
```

#### `updated_date` (string)

Last update date in ISO 8601 format.

**Example:**
```yaml
updated_date: "2024-01-15"
# or
updated_date: "2024-01-15T10:30:00Z"
```

## Section Structure

Sections are recursive and can be nested to unlimited depth. Each section must have:

```yaml
id: string              # Required: Stable section identifier
marker: string          # Required: Structural marker (e.g., "1", "א", "(a)")
sections: array         # Required: Array of nested sections (can be empty)
title: string           # Optional: Section title in Hebrew
content: string         # Optional: Section content (defaults to empty string)
```

### Section Fields

#### `id` (string, optional)

Optional stable section identifier. If not provided, a UUID will be auto-generated automatically. Must match pattern: `^[a-zA-Z0-9_-]+$` when provided.

**Examples:**
- `"sec-1"`
- `"sec-1-a"`
- `"550e8400-e29b-41d4-a716-446655440000"`

**Note:** IDs are used for tracking sections across document versions but are not used for matching (markers are used instead). Auto-generated IDs are UUIDs.

#### `marker` (string, required)

Structural marker used for diffing. This is the primary identifier for matching sections across document versions. Must be unique within the same nesting level.

**Examples:**
- `"1"` - Numeric marker
- `"1.א"` - Numeric with Hebrew letter
- `"(א)"` - Hebrew letter in parentheses
- `"II"` - Roman numeral
- `"פרק א'"` - Hebrew chapter marker

**Important:** Markers are preserved verbatim for citation purposes and are used as the primary identifier for diffing (not IDs).

#### `title` (string, optional)

Section title in Hebrew.

**Example:**
```yaml
title: "הגדרות"
```

#### `content` (string, optional)

Text content of this section only (excluding subsections). Defaults to empty string if not provided.

**Example:**
```yaml
content: |
  בחוק זה—
  "מוסד" – גוף הפועל לפי הוראות החוק.
```

#### `sections` (array, required)

Recursive array of nested sections. Can be empty. Each nested section follows the same Section schema.

**Example:**
```yaml
sections:
  - id: "sec-1-1"
    marker: "1"
    title: "תת-סעיף"
    content: "תוכן"
    sections: []
```

## Validation Rules

### Document-Level Rules

1. **Required fields** (`sections`) must be present
2. **Recommended fields** (metadata) are optional but enhance document organization
3. **`language`** (if provided) must be exactly `"hebrew"`
4. **`type`** (if provided) must be one of the allowed values
5. **`source.url`** (if provided) must be a valid URI
6. **`source.fetched_at`** (if provided) must be a valid ISO 8601 date-time
7. **`version.number`** (if provided) must be at least 1 character

### Section-Level Rules

1. **All required fields** (`id`, `marker`, `sections`) must be present
2. **`id`** must match pattern `^[a-zA-Z0-9_-]+$`
3. **`marker`** must be at least 1 character
4. **Markers must be unique** within the same nesting level
5. **`sections`** must be an array (can be empty)

### Recursive Structure

Sections can be nested to unlimited depth:

```yaml
sections:
  - id: "level1"
    marker: "1"
    sections:
      - id: "level2"
        marker: "א"
        sections:
          - id: "level3"
            marker: "(1)"
            sections:
              # ... and so on
```

## Example Documents

### Truly Minimal Document (No Metadata)

The absolute minimum valid document requires only the `sections` array:

```yaml
document:
  sections: []
```

This demonstrates that metadata fields are optional. The core diffing functionality only requires sections.

### Minimal Document with Metadata

A document with all recommended metadata fields:

```yaml
document:
  id: "law-1234"
  title: "חוק הדוגמה"
  type: "law"
  language: "hebrew"
  version:
    number: "2024-01-01"
  source:
    url: "https://example.gov.il/law1234"
    fetched_at: "2025-01-20T09:50:00Z"
  sections: []
```

### Document with Sections

```yaml
document:
  id: "law-1234"
  title: "חוק הדוגמה"
  type: "law"
  language: "hebrew"
  version:
    number: "2024-01-01"
  source:
    url: "https://example.gov.il/law1234"
    fetched_at: "2025-01-20T09:50:00Z"
  sections:
    - id: "sec-1"
      marker: "1"
      title: "הגדרות"
      content: |
        בחוק זה—
        "מוסד" – גוף הפועל לפי הוראות החוק.
      sections:
        - id: "sec-1-1"
          marker: "(א)"
          content: "מוסד כולל גם חברות ממשלתיות."
          sections: []
```

## Common Validation Errors

### Missing Required Field (sections)

**Error:** `Field required: document.sections`

The `sections` field is the only required field. All metadata fields (id, title, type, language, version, source) are optional.

**Solution:** Ensure all required fields are present in the document.

### Invalid Marker

**Error:** `Duplicate marker "1" at same nesting level`

**Solution:** Ensure markers are unique within each nesting level.

### Invalid ID Pattern

**Error:** `Section ID must match pattern ^[a-zA-Z0-9_-]+$`

**Solution:** Use only alphanumeric characters, hyphens, and underscores in section IDs.

### Invalid Language

**Error:** `Language must be "hebrew"`

**Solution:** Set `language: "hebrew"` in the document.

## Schema File Location

The complete OpenSpec schema is located at:
- **File:** `src/yamly/schema/legal_document_spec.yaml`
- **Version:** 1.0.0
- **Format:** JSON Schema Draft 2020-12 (in YAML format)

## Related Documentation

- [Getting Started](getting_started.md) - Quick start guide
- [Examples Guide](examples.md) - Example documents and templates
- [API Reference](../developer/api_reference.md) - Python API documentation
- [Architecture](../developer/architecture.md) - System architecture
