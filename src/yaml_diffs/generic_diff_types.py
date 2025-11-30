"""Generic YAML diff types for arbitrary YAML structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class GenericChangeType(str, Enum):
    """Type of change detected in generic YAML diffing.

    Attributes:
        VALUE_CHANGED: Same key/item, value changed
        TYPE_CHANGED: Node type changed (string→int, etc.)
        KEY_ADDED: New key in mapping
        KEY_REMOVED: Key removed from mapping
        KEY_RENAMED: Key name changed, value same (same location)
        KEY_MOVED: Key+value moved to different path
        ITEM_ADDED: New item in array
        ITEM_REMOVED: Item removed from array
        ITEM_CHANGED: Same item (by identity), content changed
        ITEM_MOVED: Item moved to different array/path
        UNCHANGED: No changes detected
    """

    # Value changes
    VALUE_CHANGED = "value_changed"
    TYPE_CHANGED = "type_changed"

    # Mapping (object) changes
    KEY_ADDED = "key_added"
    KEY_REMOVED = "key_removed"
    KEY_RENAMED = "key_renamed"  # Same location, key name changed
    KEY_MOVED = "key_moved"  # Same key+value, different location

    # Sequence (array) changes
    ITEM_ADDED = "item_added"
    ITEM_REMOVED = "item_removed"
    ITEM_CHANGED = "item_changed"  # Same identity, content changed
    ITEM_MOVED = "item_moved"  # Same identity, different array/path

    # No change
    UNCHANGED = "unchanged"


@dataclass
class IdentityRule:
    """Rule for identifying items in arrays.

    Attributes:
        array: Array name this rule applies to
        identity_field: Field to use as identity
        when_field: Optional condition field (for polymorphic arrays)
        when_value: Optional condition value (when when_field matches this)
    """

    array: str
    identity_field: str
    when_field: str | None = None
    when_value: str | None = None


@dataclass
class DiffOptions:
    """Options for generic YAML diffing.

    Attributes:
        identity_rules: List of rules for identifying array items
    """

    identity_rules: list[IdentityRule] = field(default_factory=list)


class GenericDiffResult(BaseModel):
    """Represents a single change detected in generic YAML diffing.

    Attributes:
        id: Unique identifier for this change (UUID)
        change_type: Type of change detected
        path: Dot notation path to the changed node
        old_path: For MOVED: original path
        new_path: For MOVED: new path
        old_key: For RENAMED: original key name
        new_key: For RENAMED: new key name
        old_value: Value in old version
        new_value: Value in new version
        old_line_number: Starting line number in old document (1-indexed)
        new_line_number: Starting line number in new document (1-indexed)
    """

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique identifier for this change (UUID)",
        min_length=1,
    )
    change_type: GenericChangeType = Field(
        description="Type of change detected",
    )
    path: str = Field(
        description="Dot notation path to the changed node",
        min_length=0,
    )
    old_path: str | None = Field(
        default=None,
        description="For MOVED: original path",
    )
    new_path: str | None = Field(
        default=None,
        description="For MOVED: new path",
    )
    old_key: str | None = Field(
        default=None,
        description="For RENAMED: original key name",
    )
    new_key: str | None = Field(
        default=None,
        description="For RENAMED: new key name",
    )
    old_value: Any = Field(
        default=None,
        description="Value in old version",
    )
    new_value: Any = Field(
        default=None,
        description="Value in new version",
    )
    old_line_number: int | None = Field(
        default=None,
        description="Starting line number in old document (1-indexed)",
    )
    new_line_number: int | None = Field(
        default=None,
        description="Starting line number in new document (1-indexed)",
    )

    model_config = {
        "str_strip_whitespace": False,
        "validate_assignment": True,
        "frozen": False,
    }


class GenericDiff(BaseModel):
    """Complete diff results for two generic YAML documents.

    Attributes:
        changes: List of all changes detected
        value_changed_count: Count of value changes
        key_added_count: Count of added keys
        key_removed_count: Count of removed keys
        key_renamed_count: Count of renamed keys
        key_moved_count: Count of moved keys
        item_added_count: Count of added items
        item_removed_count: Count of removed items
        item_changed_count: Count of changed items
        item_moved_count: Count of moved items
        type_changed_count: Count of type changes
    """

    changes: list[GenericDiffResult] = Field(
        default_factory=list,
        description="List of all changes detected",
    )
    value_changed_count: int = Field(
        default=0,
        description="Count of value changes",
        ge=0,
    )
    key_added_count: int = Field(
        default=0,
        description="Count of added keys",
        ge=0,
    )
    key_removed_count: int = Field(
        default=0,
        description="Count of removed keys",
        ge=0,
    )
    key_renamed_count: int = Field(
        default=0,
        description="Count of renamed keys",
        ge=0,
    )
    key_moved_count: int = Field(
        default=0,
        description="Count of moved keys",
        ge=0,
    )
    item_added_count: int = Field(
        default=0,
        description="Count of added items",
        ge=0,
    )
    item_removed_count: int = Field(
        default=0,
        description="Count of removed items",
        ge=0,
    )
    item_changed_count: int = Field(
        default=0,
        description="Count of changed items",
        ge=0,
    )
    item_moved_count: int = Field(
        default=0,
        description="Count of moved items",
        ge=0,
    )
    type_changed_count: int = Field(
        default=0,
        description="Count of type changes",
        ge=0,
    )

    model_config = {
        "str_strip_whitespace": False,
        "validate_assignment": True,
        "frozen": False,
    }
