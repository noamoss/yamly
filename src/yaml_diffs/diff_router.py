"""Mode detection and routing for document vs generic YAML diffing."""

from __future__ import annotations

from enum import Enum
from typing import Any

from yaml_diffs.diff import diff_documents
from yaml_diffs.diff_types import DocumentDiff
from yaml_diffs.generic_diff import diff_yaml_generic
from yaml_diffs.generic_diff_types import DiffOptions, GenericDiff
from yaml_diffs.loader import load_document


class DiffMode(str, Enum):
    """Mode for diffing YAML documents.

    Attributes:
        AUTO: Auto-detect based on structure
        GENERAL: Generic YAML diff (no schema required)
        LEGAL_DOCUMENT: Legal document diff (marker-based)
    """

    AUTO = "auto"
    GENERAL = "general"
    LEGAL_DOCUMENT = "legal_document"


def detect_mode(yaml_data: dict[str, Any]) -> DiffMode:
    """Auto-detect if YAML is a legal document or generic YAML.

    Checks for the presence of:
    - Top-level "document" key
    - "sections" array in document
    - Sections with "marker" fields

    Args:
        yaml_data: Parsed YAML data

    Returns:
        Detected mode (GENERAL or LEGAL_DOCUMENT)
    """
    if "document" in yaml_data:
        doc = yaml_data["document"]
        if isinstance(doc, dict) and "sections" in doc:
            sections = doc["sections"]
            if isinstance(sections, list) and sections:
                # Check if ANY section has a marker field (not just first)
                for section in sections:
                    if isinstance(section, dict) and "marker" in section:
                        return DiffMode.LEGAL_DOCUMENT

    return DiffMode.GENERAL


def diff_yaml_with_mode(
    old_yaml: str,
    new_yaml: str,
    mode: DiffMode = DiffMode.AUTO,
    options: DiffOptions | None = None,
) -> DocumentDiff | GenericDiff:
    """Diff two YAML documents using the specified or auto-detected mode.

    Args:
        old_yaml: Old YAML content as string
        new_yaml: New YAML content as string
        mode: Diff mode (AUTO, GENERAL, or LEGAL_DOCUMENT)
        options: Options for generic diffing (only used in GENERAL mode)

    Returns:
        DocumentDiff for legal documents, GenericDiff for generic YAML

    Raises:
        ValueError: If mode is LEGAL_DOCUMENT but documents don't match schema
    """
    import yaml  # type: ignore[import-untyped]

    # Parse YAML
    old_data = yaml.safe_load(old_yaml)
    new_data = yaml.safe_load(new_yaml)

    if old_data is None or new_data is None:
        raise ValueError("YAML documents cannot be empty")

    # Determine mode
    if mode == DiffMode.AUTO:
        # Try to detect from old document (assume both are same type)
        detected_mode = detect_mode(old_data)
    else:
        detected_mode = mode

    # Route to appropriate diff function
    if detected_mode == DiffMode.LEGAL_DOCUMENT:
        # Use existing legal document diff
        from io import StringIO

        try:
            old_io = StringIO(old_yaml)
            new_io = StringIO(new_yaml)
            old_doc = load_document(old_io)
            new_doc = load_document(new_io)
            return diff_documents(old_doc, new_doc)
        except (ValueError, TypeError) as e:
            # Handle validation errors with clearer context
            if mode == DiffMode.LEGAL_DOCUMENT:
                # Mode was explicitly set, so provide clearer error
                raise ValueError(
                    f"Documents do not match legal document schema (mode was explicitly set to 'legal_document'): {e}"
                ) from e
            raise
    else:
        # Use generic YAML diff
        if options is None:
            options = DiffOptions()
        return diff_yaml_generic(old_data, new_data, options)
