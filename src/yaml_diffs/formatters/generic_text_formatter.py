"""Text formatter for generic YAML diff output."""

from __future__ import annotations

import json
from typing import Any

from yamly.generic_diff_types import GenericChangeType, GenericDiff, GenericDiffResult


class GenericTextFormatter:
    """Formatter for outputting generic YAML diff results as human-readable text.

    Provides context-rich text output with clear before/after comparisons
    and path-based change tracking.
    """

    @staticmethod
    def format(diff: GenericDiff) -> str:
        """Format generic diff as human-readable text.

        Args:
            diff: GenericDiff to format

        Returns:
            Human-readable text representation of the diff

        Examples:
            >>> formatter = GenericTextFormatter()
            >>> text = formatter.format(diff)
            >>> print(text)
        """
        lines = []

        # Summary section
        lines.append("Generic YAML Diff Summary:")
        lines.append(f"  - Values changed: {diff.value_changed_count}")
        lines.append(f"  - Keys added: {diff.key_added_count}")
        lines.append(f"  - Keys removed: {diff.key_removed_count}")
        lines.append(f"  - Keys renamed: {diff.key_renamed_count}")
        lines.append(f"  - Keys moved: {diff.key_moved_count}")
        lines.append(f"  - Items added: {diff.item_added_count}")
        lines.append(f"  - Items removed: {diff.item_removed_count}")
        lines.append(f"  - Items changed: {diff.item_changed_count}")
        lines.append(f"  - Items moved: {diff.item_moved_count}")
        lines.append(f"  - Type changes: {diff.type_changed_count}")
        lines.append("")

        # Changes section
        if not diff.changes:
            lines.append("No changes found.")
            return "\n".join(lines)

        lines.append("Changes:")
        lines.append("")

        for i, change in enumerate(diff.changes, 1):
            lines.extend(_format_generic_change(change))
            if i < len(diff.changes):
                lines.append("")  # Separator between changes

        return "\n".join(lines)


def _format_generic_change(change: GenericDiffResult) -> list[str]:
    """Format a single generic change as text lines.

    Args:
        change: GenericDiffResult to format

    Returns:
        List of text lines for this change
    """
    lines = []

    # Change type and path header
    change_type_display = change.change_type.value.upper().replace("_", " ")
    path = _get_display_path(change)

    # Add line number if available
    line_info = _format_line_numbers(change)
    if line_info:
        lines.append(f"[{change_type_display}] {path} {line_info}")
    else:
        lines.append(f"[{change_type_display}] {path}")

    lines.append("")

    # Special handling for renamed keys
    if change.change_type == GenericChangeType.KEY_RENAMED:
        if change.old_key is not None and change.new_key is not None:
            lines.append(f"Old key: {change.old_key}")
            lines.append(f"New key: {change.new_key}")
        # Show value if available
        if change.new_value is not None:
            value_str = _format_value(change.new_value)
            lines.append(f"Value: {value_str}")
        lines.append("")
        return lines

    # Special handling for moved keys/items
    if change.change_type in (GenericChangeType.KEY_MOVED, GenericChangeType.ITEM_MOVED):
        if change.old_path is not None and change.new_path is not None:
            lines.append(f"Old path: {change.old_path}")
            lines.append(f"New path: {change.new_path}")
        # Show value if available
        if change.new_value is not None:
            value_str = _format_value(change.new_value)
            lines.append(f"Value: {value_str}")
        lines.append("")
        return lines

    # Value changes
    if change.change_type == GenericChangeType.VALUE_CHANGED:
        if change.old_value is not None:
            old_value_str = _format_value(change.old_value)
            lines.append(f"Old: {old_value_str}")
        if change.new_value is not None:
            new_value_str = _format_value(change.new_value)
            lines.append(f"New: {new_value_str}")
        lines.append("")
        return lines

    # Type changes
    if change.change_type == GenericChangeType.TYPE_CHANGED:
        if change.old_value is not None:
            old_value_str = _format_value(change.old_value)
            old_type = type(change.old_value).__name__
            lines.append(f"Old ({old_type}): {old_value_str}")
        if change.new_value is not None:
            new_value_str = _format_value(change.new_value)
            new_type = type(change.new_value).__name__
            lines.append(f"New ({new_type}): {new_value_str}")
        lines.append("")
        return lines

    # Added keys/items
    if change.change_type in (GenericChangeType.KEY_ADDED, GenericChangeType.ITEM_ADDED):
        if change.new_value is not None:
            value_str = _format_value(change.new_value)
            lines.append(f"Value: {value_str}")
        lines.append("")
        return lines

    # Removed keys/items
    if change.change_type in (GenericChangeType.KEY_REMOVED, GenericChangeType.ITEM_REMOVED):
        if change.old_value is not None:
            value_str = _format_value(change.old_value)
            lines.append(f"Old value: {value_str}")
        lines.append("")
        return lines

    # Changed items
    if change.change_type == GenericChangeType.ITEM_CHANGED:
        if change.old_value is not None:
            old_value_str = _format_value(change.old_value)
            lines.append(f"Old: {old_value_str}")
        if change.new_value is not None:
            new_value_str = _format_value(change.new_value)
            lines.append(f"New: {new_value_str}")
        lines.append("")
        return lines

    # Unchanged (shouldn't normally appear, but handle gracefully)
    if change.change_type == GenericChangeType.UNCHANGED:
        if change.new_value is not None:
            value_str = _format_value(change.new_value)
            lines.append(f"Value: {value_str}")
        lines.append("")
        return lines

    # Fallback for any unhandled change types
    if change.old_value is not None:
        old_value_str = _format_value(change.old_value)
        lines.append(f"Old: {old_value_str}")
    if change.new_value is not None:
        new_value_str = _format_value(change.new_value)
        lines.append(f"New: {new_value_str}")
    lines.append("")
    return lines


def _get_display_path(change: GenericDiffResult) -> str:
    """Get the path to display for a change.

    For moved items, shows old_path -> new_path.
    Otherwise uses the main path field.

    Args:
        change: GenericDiffResult to get path from

    Returns:
        Formatted path string
    """
    # For moved items, show both paths
    if change.change_type in (GenericChangeType.KEY_MOVED, GenericChangeType.ITEM_MOVED):
        if change.old_path is not None and change.new_path is not None:
            return f"{change.old_path} -> {change.new_path}"
        # Fallback to main path if old_path/new_path not set
        return change.path

    # For renamed keys, show the path (which should be the same)
    if change.change_type == GenericChangeType.KEY_RENAMED:
        return change.path

    # For all other changes, use the main path
    return change.path


def _format_line_numbers(change: GenericDiffResult) -> str:
    """Format line number information for display.

    Args:
        change: GenericDiffResult to get line numbers from

    Returns:
        Formatted line number string, e.g., "(line 5)" or "(old: 5, new: 6)"
    """
    old_line = change.old_line_number
    new_line = change.new_line_number

    if old_line is not None and new_line is not None:
        if old_line == new_line:
            return f"(line {old_line})"
        return f"(old: {old_line}, new: {new_line})"
    elif old_line is not None:
        return f"(old line {old_line})"
    elif new_line is not None:
        return f"(line {new_line})"
    return ""


def _format_value(value: Any, max_length: int = 100) -> str:
    """Format a value for display, with truncation for long values.

    Args:
        value: Value to format
        max_length: Maximum length before truncation (default: 100)

    Returns:
        Formatted string representation of the value
    """
    # Handle None
    if value is None:
        return "null"

    # Handle strings - use repr to show quotes
    if isinstance(value, str):
        if len(value) > max_length:
            return repr(value[:max_length] + "...")
        return repr(value)

    # Handle simple types (numbers, booleans)
    if isinstance(value, (int, float, bool)):
        return str(value)

    # Handle complex types (dict, list) - use JSON for readability
    try:
        json_str = json.dumps(value, ensure_ascii=False, indent=None)
        if len(json_str) > max_length:
            return json_str[:max_length] + "..."
        return json_str
    except (TypeError, ValueError):
        # Fallback to repr if JSON serialization fails
        value_str = repr(value)
        if len(value_str) > max_length:
            return value_str[:max_length] + "..."
        return value_str
