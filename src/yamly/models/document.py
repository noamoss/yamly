"""Document model for legal documents."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

from yamly.models.section import Section


class Version(BaseModel):
    """Document version information.

    Attributes:
        number: Optional version identifier or date (e.g., "2024-11-01", "v1.0").
        description: Optional version description.
    """

    number: str | None = Field(
        default=None,
        description="Version identifier for tracking document versions (recommended for version control).",
        min_length=1,
    )
    description: str | None = Field(
        default=None,
        description="Optional version description.",
    )


class Source(BaseModel):
    """Document source information.

    Attributes:
        url: Optional original source URL (must be valid URI if provided).
        fetched_at: Optional ISO 8601 timestamp when document was fetched.
    """

    url: str | None = Field(
        default=None,
        description="Source URL for provenance and attribution (recommended for traceability).",
        min_length=1,
    )
    fetched_at: str | None = Field(
        default=None,
        description="Timestamp when document was retrieved (recommended for audit trails).",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate that url is a valid URI."""
        if v is None:
            return v
        try:
            result = urlparse(v)
            if not all([result.scheme, result.netloc]):
                raise ValueError(f"url must be a valid URI with scheme and netloc, got: {v}")
            return v
        except Exception as err:
            raise ValueError(f"url must be a valid URI, got: {v}") from err

    @field_validator("fetched_at")
    @classmethod
    def validate_fetched_at_format(cls, v: str | None) -> str | None:
        """Validate that fetched_at is in ISO 8601 format."""
        if v is None:
            return v
        try:
            # Handle 'Z' timezone indicator - only replace trailing 'Z'
            # Guard against edge case where v is just "Z"
            if v.endswith("Z") and len(v) > 1:
                date_str = v[:-1] + "+00:00"
            else:
                date_str = v
            datetime.fromisoformat(date_str)
            return v
        except ValueError as err:
            raise ValueError(
                f"fetched_at must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS), got: {v}"
            ) from err


class Document(BaseModel):
    """Represents a complete legal document.

    A document contains metadata and a list of root sections. Sections can be
    nested recursively to unlimited depth. Matches the JSON Schema structure.

    All metadata fields (id, title, type, language, version, source) are optional.
    The core diffing functionality only requires the `sections` array and section
    `marker` fields. Metadata fields are recommended for better document organization
    and tracking but are not functionally required.

    Attributes:
        id: Optional stable document identifier (recommended: UUID or canonical ID).
        title: Optional document title for human readability (recommended for documentation).
        type: Optional document type classification (recommended for organization and filtering). Accepts any string value.
        language: Optional document language specification (recommended for multi-language support).
        version: Optional document version information (recommended for version control).
        source: Optional document source information (recommended for traceability).
        authors: Optional list of authors, entities, or organizations. Supports Hebrew text.
        published_date: Optional publication date in ISO 8601 format.
        updated_date: Optional last update date in ISO 8601 format.
        sections: Required list of root-level sections in the document (can be empty).

    Examples:
        >>> # Minimal document with only sections
        >>> doc = Document(sections=[Section(marker="1", content="Introduction")])
        >>>
        >>> # Full document with all metadata
        >>> doc = Document(
        ...     id="law-1234",
        ...     title="חוק יסוד: כבוד האדם וחירותו",
        ...     type="law",
        ...     language="hebrew",
        ...     version=Version(number="1.0"),
        ...     source=Source(url="https://example.com/law", fetched_at="2025-01-20T09:50:00Z"),
        ...     authors=["הכנסת"],
        ...     published_date="1992-03-17",
        ...     updated_date="2024-01-15",
        ...     sections=[Section(marker="1", content="Introduction")]
        ... )
    """

    id: str | None = Field(
        default=None,
        description="Stable document identifier for tracking and reference (recommended: UUID or canonical ID).",
        min_length=1,
    )
    title: str | None = Field(
        default=None,
        description="Document title for human readability (recommended for documentation).",
        min_length=1,
    )
    type: str | None = Field(
        default=None,
        description="Document type classification (recommended for organization and filtering). Accepts any string value.",
    )
    language: Literal["hebrew"] | None = Field(
        default=None,
        description="Document language specification (recommended for multi-language support).",
    )
    version: Version | None = Field(
        default=None,
        description="Document version information (recommended for version control).",
    )
    source: Source | None = Field(
        default=None,
        description="Document source information (recommended for traceability).",
    )
    authors: list[str] | None = Field(
        default=None,
        description="Optional list of authors, entities, or organizations. Supports Hebrew text (UTF-8).",
    )
    published_date: str | None = Field(
        default=None,
        description="Optional publication date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
    )
    updated_date: str | None = Field(
        default=None,
        description="Optional last update date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
    )
    sections: list[Section] = Field(
        default_factory=list,
        description="Required list of root-level sections in the document (can be empty).",
    )

    @field_validator("published_date", "updated_date")
    @classmethod
    def validate_date_format(cls, v: str | None) -> str | None:
        """Validate that date strings are in ISO 8601 format."""
        if v is None:
            return v
        try:
            # Try parsing as ISO 8601 (supports both date and datetime)
            # Handle 'Z' timezone indicator - only replace trailing 'Z'
            # Guard against edge case where v is just "Z"
            if v.endswith("Z") and len(v) > 1:
                date_str = v[:-1] + "+00:00"
            else:
                date_str = v
            datetime.fromisoformat(date_str)
            return v
        except ValueError as err:
            raise ValueError(
                f"Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS), got: {v}"
            ) from err

    model_config = {
        "str_strip_whitespace": False,  # Preserve whitespace in metadata
        "validate_assignment": True,
        "frozen": False,  # Allow mutation for diffing operations
    }
