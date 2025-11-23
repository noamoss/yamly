"""Document model for legal documents."""

from typing import Optional

from pydantic import BaseModel, Field

from yaml_diffs.models.section import Section


class Document(BaseModel):
    """Represents a complete legal document.

    A document contains metadata and a list of root sections. Sections can be
    nested recursively to unlimited depth.

    Attributes:
        title: Document name or title. Supports Hebrew text (UTF-8).
        authors: List of authors, entities, or organizations. Supports Hebrew text.
        version: Document version identifier (e.g., "1.0", "2024-01-15").
        source: Optional source identifier or URL for the document.
        published_date: Publication date in ISO 8601 format.
        updated_date: Last update date in ISO 8601 format.
        sections: List of root-level sections in the document.

    Examples:
        >>> doc = Document(
        ...     title="חוק יסוד: כבוד האדם וחירותו",
        ...     authors=["הכנסת"],
        ...     version="1.0",
        ...     source="https://example.com/law",
        ...     published_date="1992-03-17",
        ...     updated_date="2024-01-15",
        ...     sections=[Section(id="...", content="Introduction")]
        ... )
    """

    title: Optional[str] = Field(
        default=None,
        description="Document name or title. Supports Hebrew text (UTF-8).",
    )
    authors: Optional[list[str]] = Field(
        default=None,
        description="List of authors, entities, or organizations. Supports Hebrew text (UTF-8).",
    )
    version: str = Field(
        description="Document version identifier (e.g., '1.0', '2024-01-15').",
    )
    source: Optional[str] = Field(
        default=None,
        description="Optional source identifier or URL for the document.",
    )
    published_date: Optional[str] = Field(
        default=None,
        description="Publication date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
    )
    updated_date: Optional[str] = Field(
        default=None,
        description="Last update date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
    )
    sections: list[Section] = Field(
        default_factory=list,
        description="List of root-level sections in the document.",
    )

    model_config = {
        "str_strip_whitespace": False,  # Preserve whitespace in metadata
        "validate_assignment": True,
        "frozen": False,  # Allow mutation for diffing operations
    }
