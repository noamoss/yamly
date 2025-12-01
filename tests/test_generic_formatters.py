"""Tests for generic YAML diff formatters."""

from __future__ import annotations

from uuid import uuid4

import yaml

from yamly.formatters import GenericTextFormatter, GenericYamlFormatter
from yamly.generic_diff_types import GenericChangeType, GenericDiff, GenericDiffResult


class TestGenericTextFormatter:
    """Tests for GenericTextFormatter."""

    def test_format_text_shows_summary(self):
        """Test that text output shows summary counts."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.database.host",
                    old_value="localhost",
                    new_value="db.example.com",
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "Generic YAML Diff Summary" in output
        assert "Values changed: 1" in output

    def test_format_text_all_change_types(self):
        """Test that all change types are displayed correctly."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.host",
                    old_value="old",
                    new_value="new",
                ),
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_ADDED,
                    path="config.new_key",
                    new_value="value",
                ),
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_REMOVED,
                    path="config.old_key",
                    old_value="value",
                ),
            ],
            value_changed_count=1,
            key_added_count=1,
            key_removed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "[VALUE CHANGED]" in output
        assert "[KEY ADDED]" in output
        assert "[KEY REMOVED]" in output

    def test_format_text_value_changed(self):
        """Test formatting VALUE_CHANGED change type."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.database.host",
                    old_value="localhost",
                    new_value="db.example.com",
                    old_line_number=5,
                    new_line_number=5,
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "config.database.host" in output
        assert "'localhost'" in output
        assert "'db.example.com'" in output
        assert "(line 5)" in output

    def test_format_text_key_renamed(self):
        """Test formatting KEY_RENAMED change type."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_RENAMED,
                    path="config.database",
                    old_key="host",
                    new_key="hostname",
                    new_value="db.example.com",
                ),
            ],
            key_renamed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "[KEY RENAMED]" in output
        assert "Old key: host" in output
        assert "New key: hostname" in output

    def test_format_text_key_moved(self):
        """Test formatting KEY_MOVED change type."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_MOVED,
                    path="config.database.host",
                    old_path="database.host",
                    new_path="config.database.host",
                    new_value="db.example.com",
                ),
            ],
            key_moved_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "[KEY MOVED]" in output
        assert "Old path: database.host" in output
        assert "New path: config.database.host" in output

    def test_format_text_item_moved(self):
        """Test formatting ITEM_MOVED change type."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.ITEM_MOVED,
                    path="servers[0]",
                    old_path="servers[2]",
                    new_path="servers[0]",
                    new_value={"name": "server1"},
                ),
            ],
            item_moved_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "[ITEM MOVED]" in output
        assert "Old path: servers[2]" in output
        assert "New path: servers[0]" in output

    def test_format_text_type_changed(self):
        """Test formatting TYPE_CHANGED change type."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.TYPE_CHANGED,
                    path="config.port",
                    old_value="8080",  # String
                    new_value=8080,  # Integer
                ),
            ],
            type_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "[TYPE CHANGED]" in output
        assert "Old (str):" in output
        assert "New (int):" in output

    def test_format_text_empty_diff(self):
        """Test formatting empty diff."""
        diff = GenericDiff()
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "No changes found." in output
        assert "Values changed: 0" in output

    def test_format_text_large_value_truncation(self):
        """Test that large values are truncated."""
        long_value = "x" * 150
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.description",
                    old_value="short",
                    new_value=long_value,
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        # Should be truncated to 100 chars + "..."
        assert len([line for line in output.split("\n") if "xxx" in line]) > 0
        # Check that truncation occurred
        assert "..." in output

    def test_format_text_missing_line_numbers(self):
        """Test formatting with missing line numbers."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.host",
                    old_value="old",
                    new_value="new",
                    old_line_number=None,
                    new_line_number=None,
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        # Should not have line number info
        assert "(line" not in output
        assert "config.host" in output

    def test_format_text_different_line_numbers(self):
        """Test formatting with different old and new line numbers."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.host",
                    old_value="old",
                    new_value="new",
                    old_line_number=5,
                    new_line_number=7,
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "(old: 5, new: 7)" in output

    def test_format_text_complex_nested_values(self):
        """Test formatting with complex nested values."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.database",
                    old_value={"host": "localhost", "port": 5432},
                    new_value={"host": "db.example.com", "port": 5433},
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "config.database" in output
        # Should serialize complex values as JSON
        assert "localhost" in output or "db.example.com" in output

    def test_format_text_all_summary_counts(self):
        """Test that all summary counts are displayed."""
        diff = GenericDiff(
            changes=[],
            value_changed_count=1,
            key_added_count=2,
            key_removed_count=3,
            key_renamed_count=4,
            key_moved_count=5,
            item_added_count=6,
            item_removed_count=7,
            item_changed_count=8,
            item_moved_count=9,
            type_changed_count=10,
        )
        formatter = GenericTextFormatter()
        output = formatter.format(diff)
        assert "Values changed: 1" in output
        assert "Keys added: 2" in output
        assert "Keys removed: 3" in output
        assert "Keys renamed: 4" in output
        assert "Keys moved: 5" in output
        assert "Items added: 6" in output
        assert "Items removed: 7" in output
        assert "Items changed: 8" in output
        assert "Items moved: 9" in output
        assert "Type changes: 10" in output


class TestGenericYamlFormatter:
    """Tests for GenericYamlFormatter."""

    def test_format_yaml_structure(self):
        """Test that YAML output has correct structure."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.host",
                    old_value="old",
                    new_value="new",
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        assert isinstance(parsed, dict)
        assert "summary" in parsed
        assert "changes" in parsed

    def test_format_yaml_parseable(self):
        """Test that YAML output can be parsed back."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_ADDED,
                    path="config.new_key",
                    new_value="value",
                ),
            ],
            key_added_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        assert parsed["summary"]["key_added_count"] == 1
        assert len(parsed["changes"]) == 1
        assert parsed["changes"][0]["change_type"] == "key_added"

    def test_format_yaml_includes_all_fields(self):
        """Test that YAML includes all change fields."""
        change_id = str(uuid4())
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=change_id,
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.host",
                    old_value="localhost",
                    new_value="db.example.com",
                    old_line_number=5,
                    new_line_number=6,
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        change = parsed["changes"][0]
        assert change["id"] == change_id
        assert change["change_type"] == "value_changed"
        assert change["path"] == "config.host"
        assert change["old_value"] == "localhost"
        assert change["new_value"] == "db.example.com"
        assert change["old_line_number"] == 5
        assert change["new_line_number"] == 6

    def test_format_yaml_key_renamed(self):
        """Test YAML output for KEY_RENAMED."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_RENAMED,
                    path="config.database",
                    old_key="host",
                    new_key="hostname",
                    new_value="db.example.com",
                ),
            ],
            key_renamed_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        change = parsed["changes"][0]
        assert change["old_key"] == "host"
        assert change["new_key"] == "hostname"

    def test_format_yaml_key_moved(self):
        """Test YAML output for KEY_MOVED."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_MOVED,
                    path="config.database.host",
                    old_path="database.host",
                    new_path="config.database.host",
                    new_value="db.example.com",
                ),
            ],
            key_moved_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        change = parsed["changes"][0]
        assert change["old_path"] == "database.host"
        assert change["new_path"] == "config.database.host"

    def test_format_yaml_empty_diff(self):
        """Test formatting empty diff."""
        diff = GenericDiff()
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        assert parsed["summary"]["value_changed_count"] == 0
        assert len(parsed["changes"]) == 0

    def test_format_yaml_all_summary_counts(self):
        """Test that all summary counts are included."""
        diff = GenericDiff(
            changes=[],
            value_changed_count=1,
            key_added_count=2,
            key_removed_count=3,
            key_renamed_count=4,
            key_moved_count=5,
            item_added_count=6,
            item_removed_count=7,
            item_changed_count=8,
            item_moved_count=9,
            type_changed_count=10,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        summary = parsed["summary"]
        assert summary["value_changed_count"] == 1
        assert summary["key_added_count"] == 2
        assert summary["key_removed_count"] == 3
        assert summary["key_renamed_count"] == 4
        assert summary["key_moved_count"] == 5
        assert summary["item_added_count"] == 6
        assert summary["item_removed_count"] == 7
        assert summary["item_changed_count"] == 8
        assert summary["item_moved_count"] == 9
        assert summary["type_changed_count"] == 10

    def test_format_yaml_omits_none_fields(self):
        """Test that None fields are omitted from YAML output."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.KEY_ADDED,
                    path="config.new_key",
                    new_value="value",
                    # All optional fields are None
                ),
            ],
            key_added_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        change = parsed["changes"][0]
        # Should not have None fields
        assert "old_path" not in change
        assert "new_path" not in change
        assert "old_key" not in change
        assert "new_key" not in change
        assert "old_value" not in change
        assert "old_line_number" not in change
        assert "new_line_number" not in change
        # Should have required fields
        assert "id" in change
        assert "change_type" in change
        assert "path" in change
        assert "new_value" in change

    def test_format_yaml_complex_values(self):
        """Test YAML output with complex nested values."""
        diff = GenericDiff(
            changes=[
                GenericDiffResult(
                    id=str(uuid4()),
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path="config.database",
                    old_value={"host": "localhost", "port": 5432},
                    new_value={"host": "db.example.com", "port": 5433},
                ),
            ],
            value_changed_count=1,
        )
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        change = parsed["changes"][0]
        assert isinstance(change["old_value"], dict)
        assert isinstance(change["new_value"], dict)
        assert change["old_value"]["host"] == "localhost"
        assert change["new_value"]["host"] == "db.example.com"

    def test_format_yaml_all_change_types(self):
        """Test YAML output for all change types."""
        all_types = [
            GenericChangeType.VALUE_CHANGED,
            GenericChangeType.TYPE_CHANGED,
            GenericChangeType.KEY_ADDED,
            GenericChangeType.KEY_REMOVED,
            GenericChangeType.KEY_RENAMED,
            GenericChangeType.KEY_MOVED,
            GenericChangeType.ITEM_ADDED,
            GenericChangeType.ITEM_REMOVED,
            GenericChangeType.ITEM_CHANGED,
            GenericChangeType.ITEM_MOVED,
        ]
        changes = [
            GenericDiffResult(
                id=str(uuid4()),
                change_type=change_type,
                path=f"config.test_{i}",
                new_value="value" if change_type != GenericChangeType.KEY_REMOVED else None,
                old_value="old"
                if change_type in (GenericChangeType.VALUE_CHANGED, GenericChangeType.KEY_REMOVED)
                else None,
            )
            for i, change_type in enumerate(all_types)
        ]
        diff = GenericDiff(changes=changes)
        formatter = GenericYamlFormatter()
        output = formatter.format(diff)
        parsed = yaml.safe_load(output)
        assert len(parsed["changes"]) == len(all_types)
        output_types = {change["change_type"] for change in parsed["changes"]}
        expected_types = {ct.value for ct in all_types}
        assert output_types == expected_types
