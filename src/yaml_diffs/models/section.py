"""Section model for recursive document structure."""

from __future__ import annotations

from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Section(BaseModel):
    """Represents a section in a legal document.

    Sections can be nested recursively to unlimited depth. Each section
    must have a stable UUID identifier for reliable diffing across versions.

    Attributes:
        id: Unique identifier (UUID). Auto-generated if not provided.
        content: Text content for this section level only (not children).
            Defaults to empty string. Supports Hebrew text (UTF-8).
        marker: Optional structural marker (e.g., "א", "1", "a").
        title: Optional section title. Supports Hebrew text (UTF-8).
        sections: Optional list of nested child sections.

    Examples:
        >>> section = Section(id="123e4567-e89b-12d3-a456-426614174000", content="Hello")
        >>> nested = Section(id="...", content="World", sections=[section])
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier (UUID). Auto-generated if not provided.",
    )
    content: str = Field(
        default="",
        description="Text content for this section level only (not children).",
    )
    marker: Optional[str] = Field(
        default=None,
        description="Optional structural marker (e.g., 'א', '1', 'a').",
    )
    title: Optional[str] = Field(
        default=None,
        description="Optional section title.",
    )
    sections: list[Section] = Field(
        default_factory=list,
        description="Optional list of nested child sections.",
    )

    model_config = {
        "str_strip_whitespace": False,  # Preserve whitespace in content
        "validate_assignment": True,
        "frozen": False,  # Allow mutation for diffing operations
    }
