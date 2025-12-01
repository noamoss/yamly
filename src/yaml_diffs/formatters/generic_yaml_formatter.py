"""YAML formatter for generic YAML diff output."""

from __future__ import annotations

from typing import Any, cast

import yaml  # type: ignore[import-untyped]

from yaml_diffs.generic_diff_types import GenericDiff, GenericDiffResult


class GenericYamlFormatter:
    """Formatter for outputting generic YAML diff results as YAML.

    Provides structured YAML output with summary counts and detailed change information.
    """

    @staticmethod
    def format(
        diff: GenericDiff,
        default_flow_style: bool = False,
        allow_unicode: bool = True,
    ) -> str:
        """Format generic diff as YAML string.

        Args:
            diff: GenericDiff to format
            default_flow_style: Use flow style for collections (default: False)
            allow_unicode: Allow Unicode characters in output (default: True)

        Returns:
            YAML string representation of the diff

        Examples:
            >>> formatter = GenericYamlFormatter()
            >>> yaml_str = formatter.format(diff)
            >>> yaml.safe_load(yaml_str)  # Valid YAML
        """
        # Build summary from diff counts
        summary = {
            "value_changed_count": diff.value_changed_count,
            "key_added_count": diff.key_added_count,
            "key_removed_count": diff.key_removed_count,
            "key_renamed_count": diff.key_renamed_count,
            "key_moved_count": diff.key_moved_count,
            "item_added_count": diff.item_added_count,
            "item_removed_count": diff.item_removed_count,
            "item_changed_count": diff.item_changed_count,
            "item_moved_count": diff.item_moved_count,
            "type_changed_count": diff.type_changed_count,
        }

        # Convert changes to dictionaries
        changes = [_generic_diff_result_to_dict(change) for change in diff.changes]

        # Build output structure
        output = {
            "summary": summary,
            "changes": changes,
        }

        # Serialize to YAML
        return cast(
            str,
            yaml.dump(
                output,
                default_flow_style=default_flow_style,
                allow_unicode=allow_unicode,
                sort_keys=False,
            ),
        )


def _generic_diff_result_to_dict(change: GenericDiffResult) -> dict[str, Any]:
    """Convert GenericDiffResult to dictionary for serialization.

    Args:
        change: GenericDiffResult to convert

    Returns:
        Dictionary representation suitable for YAML serialization
    """
    result: dict[str, Any] = {
        "id": change.id,
        "change_type": change.change_type.value,
        "path": change.path,
    }

    # Add optional fields only if they are not None
    if change.old_path is not None:
        result["old_path"] = change.old_path
    if change.new_path is not None:
        result["new_path"] = change.new_path
    if change.old_key is not None:
        result["old_key"] = change.old_key
    if change.new_key is not None:
        result["new_key"] = change.new_key
    if change.old_value is not None:
        result["old_value"] = change.old_value
    if change.new_value is not None:
        result["new_value"] = change.new_value
    if change.old_line_number is not None:
        result["old_line_number"] = change.old_line_number
    if change.new_line_number is not None:
        result["new_line_number"] = change.new_line_number

    return result
