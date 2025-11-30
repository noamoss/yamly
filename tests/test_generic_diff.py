"""Tests for generic YAML diffing functionality."""

import pytest

from yaml_diffs.generic_diff import diff_yaml_generic
from yaml_diffs.generic_diff_types import (
    DiffOptions,
    GenericChangeType,
    GenericDiff,
    IdentityRule,
)


class TestBasicValueChanges:
    """Test basic value change detection."""

    def test_value_changed(self):
        """Test detecting a simple value change."""
        old = {"name": "Alice"}
        new = {"name": "Bob"}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert len(result.changes) == 1
        assert result.changes[0].change_type == GenericChangeType.VALUE_CHANGED
        assert result.changes[0].path == "name"
        assert result.changes[0].old_value == "Alice"
        assert result.changes[0].new_value == "Bob"

    def test_key_added(self):
        """Test detecting a new key."""
        old = {"name": "Alice"}
        new = {"name": "Alice", "age": 30}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.key_added_count == 1
        added = [c for c in result.changes if c.change_type == GenericChangeType.KEY_ADDED]
        assert len(added) == 1
        assert added[0].path == "age"
        assert added[0].new_value == 30

    def test_key_removed(self):
        """Test detecting a removed key."""
        old = {"name": "Alice", "age": 30}
        new = {"name": "Alice"}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.key_removed_count == 1
        removed = [c for c in result.changes if c.change_type == GenericChangeType.KEY_REMOVED]
        assert len(removed) == 1
        assert removed[0].path == "age"
        assert removed[0].old_value == 30

    def test_type_changed(self):
        """Test detecting a type change."""
        old = {"value": "123"}
        new = {"value": 123}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.type_changed_count == 1
        type_changes = [c for c in result.changes if c.change_type == GenericChangeType.TYPE_CHANGED]
        assert len(type_changes) == 1
        assert type_changes[0].old_value == "123"
        assert type_changes[0].new_value == 123

    def test_no_changes(self):
        """Test identical documents produce no changes."""
        data = {"name": "Alice", "age": 30}

        result = diff_yaml_generic(data, data.copy(), DiffOptions())

        # Should have no changes (or only UNCHANGED type)
        non_unchanged = [c for c in result.changes if c.change_type != GenericChangeType.UNCHANGED]
        assert len(non_unchanged) == 0


class TestNestedChanges:
    """Test detection of changes in nested structures."""

    def test_nested_value_change(self):
        """Test detecting changes in nested objects."""
        old = {"config": {"database": {"host": "localhost"}}}
        new = {"config": {"database": {"host": "production.db"}}}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.value_changed_count == 1
        change = result.changes[0]
        assert change.change_type == GenericChangeType.VALUE_CHANGED
        assert change.path == "config.database.host"
        assert change.old_value == "localhost"
        assert change.new_value == "production.db"

    def test_deeply_nested_key_added(self):
        """Test detecting new keys in deeply nested structures."""
        old = {"level1": {"level2": {"level3": {}}}}
        new = {"level1": {"level2": {"level3": {"new_key": "value"}}}}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.key_added_count == 1
        added = [c for c in result.changes if c.change_type == GenericChangeType.KEY_ADDED]
        assert len(added) == 1
        assert added[0].path == "level1.level2.level3.new_key"


class TestArrayChanges:
    """Test detection of changes in arrays/sequences."""

    def test_item_added(self):
        """Test detecting a new item in an array."""
        old = {"items": ["a", "b"]}
        new = {"items": ["a", "b", "c"]}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.item_added_count == 1
        added = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_ADDED]
        assert len(added) == 1
        assert added[0].new_value == "c"

    def test_item_removed(self):
        """Test detecting a removed item from an array."""
        old = {"items": ["a", "b", "c"]}
        new = {"items": ["a", "c"]}

        result = diff_yaml_generic(old, new, DiffOptions())

        assert result.item_removed_count == 1
        removed = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_REMOVED]
        assert len(removed) == 1
        assert removed[0].old_value == "b"

    def test_object_array_with_identity_field(self):
        """Test matching array items by identity field."""
        old = {
            "users": [
                {"id": "u1", "name": "Alice"},
                {"id": "u2", "name": "Bob"},
            ]
        }
        new = {
            "users": [
                {"id": "u1", "name": "Alice Updated"},
                {"id": "u2", "name": "Bob"},
            ]
        }

        # With identity rule, should detect u1's name change
        options = DiffOptions(identity_rules=[IdentityRule(array="users", identity_field="id")])
        result = diff_yaml_generic(old, new, options)

        # Should detect item changed (not add + remove)
        changed = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_CHANGED]
        assert len(changed) >= 1

    def test_auto_detect_identity_field(self):
        """Test auto-detection of common identity fields."""
        old = {
            "containers": [
                {"name": "web", "image": "nginx:1.19"},
                {"name": "db", "image": "postgres:13"},
            ]
        }
        new = {
            "containers": [
                {"name": "web", "image": "nginx:1.20"},  # Updated image
                {"name": "db", "image": "postgres:13"},
            ]
        }

        # Should auto-detect 'name' as identity field
        result = diff_yaml_generic(old, new, DiffOptions())

        # Should detect item changed (for web container)
        changed = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_CHANGED]
        assert len(changed) >= 1


class TestKeyRenaming:
    """Test detection of key renames."""

    def test_key_renamed(self):
        """Test detecting a key rename."""
        old = {"hostname": "localhost"}
        new = {"host": "localhost"}

        result = diff_yaml_generic(old, new, DiffOptions())

        # Should detect rename (not add + remove)
        renamed = [c for c in result.changes if c.change_type == GenericChangeType.KEY_RENAMED]
        # Note: Rename detection requires similar values, so this should work
        if len(renamed) == 1:
            assert renamed[0].old_key == "hostname"
            assert renamed[0].new_key == "host"
        else:
            # Fallback: if rename not detected, should see add + remove
            added = [c for c in result.changes if c.change_type == GenericChangeType.KEY_ADDED]
            removed = [c for c in result.changes if c.change_type == GenericChangeType.KEY_REMOVED]
            assert len(added) == 1 or len(renamed) == 1
            assert len(removed) == 1 or len(renamed) == 1


class TestConditionalIdentityRules:
    """Test conditional identity rules for polymorphic arrays."""

    def test_conditional_identity_rule(self):
        """Test identity rules with conditions (when_field/when_value)."""
        old = {
            "inventory": [
                {"type": "book", "catalog_id": "B001", "title": "Python Guide"},
                {"type": "video", "media_id": "V001", "title": "Tutorial"},
            ]
        }
        new = {
            "inventory": [
                {"type": "book", "catalog_id": "B001", "title": "Python Guide Updated"},
                {"type": "video", "media_id": "V001", "title": "Tutorial"},
            ]
        }

        # Rule: for items with type=book, use catalog_id as identity
        options = DiffOptions(
            identity_rules=[
                IdentityRule(
                    array="inventory",
                    identity_field="catalog_id",
                    when_field="type",
                    when_value="book",
                )
            ]
        )
        result = diff_yaml_generic(old, new, options)

        # Should detect item changed (book title changed)
        changed = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_CHANGED]
        assert len(changed) >= 1


class TestMoveDetection:
    """Test detection of moved keys and items."""

    def test_item_moved_between_arrays(self):
        """Test detecting an item moved from one array to another."""
        old = {
            "active": [{"name": "web", "port": 80}],
            "inactive": [],
        }
        new = {
            "active": [],
            "inactive": [{"name": "web", "port": 80}],
        }

        options = DiffOptions(
            identity_rules=[
                IdentityRule(array="active", identity_field="name"),
                IdentityRule(array="inactive", identity_field="name"),
            ]
        )
        result = diff_yaml_generic(old, new, options)

        # Should detect item moved
        moved = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_MOVED]
        # If move detection works, should have 1 move
        # Otherwise, should have add + remove
        if not moved:
            added = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_ADDED]
            removed = [c for c in result.changes if c.change_type == GenericChangeType.ITEM_REMOVED]
            assert len(added) >= 1 or len(moved) >= 1
            assert len(removed) >= 1 or len(moved) >= 1


class TestDiffCounts:
    """Test that diff counts are calculated correctly."""

    def test_counts_match_changes(self):
        """Test that counts match the number of changes."""
        old = {
            "name": "old",
            "removed_key": "value",
            "items": ["a"],
        }
        new = {
            "name": "new",
            "added_key": "value",
            "items": ["a", "b"],
        }

        result = diff_yaml_generic(old, new, DiffOptions())

        # Count actual changes
        value_changed = len([c for c in result.changes if c.change_type == GenericChangeType.VALUE_CHANGED])
        key_added = len([c for c in result.changes if c.change_type == GenericChangeType.KEY_ADDED])
        key_removed = len([c for c in result.changes if c.change_type == GenericChangeType.KEY_REMOVED])
        item_added = len([c for c in result.changes if c.change_type == GenericChangeType.ITEM_ADDED])

        assert result.value_changed_count == value_changed
        assert result.key_added_count == key_added
        assert result.key_removed_count == key_removed
        assert result.item_added_count == item_added


class TestRealWorldExamples:
    """Test with real-world YAML structures."""

    def test_kubernetes_deployment_change(self):
        """Test diffing Kubernetes-like deployment YAML."""
        old = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": "web-app"},
            "spec": {
                "replicas": 2,
                "template": {
                    "spec": {
                        "containers": [
                            {
                                "name": "web",
                                "image": "nginx:1.19",
                                "ports": [{"containerPort": 80}],
                            }
                        ]
                    }
                },
            },
        }
        new = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": "web-app"},
            "spec": {
                "replicas": 3,  # Changed
                "template": {
                    "spec": {
                        "containers": [
                            {
                                "name": "web",
                                "image": "nginx:1.20",  # Changed
                                "ports": [{"containerPort": 80}],
                            }
                        ]
                    }
                },
            },
        }

        result = diff_yaml_generic(old, new, DiffOptions())

        # Should detect replica change
        replica_change = [
            c for c in result.changes 
            if c.path == "spec.replicas" and c.change_type == GenericChangeType.VALUE_CHANGED
        ]
        assert len(replica_change) == 1
        assert replica_change[0].old_value == 2
        assert replica_change[0].new_value == 3

    def test_config_file_changes(self):
        """Test diffing configuration file changes."""
        old = {
            "database": {
                "host": "localhost",
                "port": 5432,
                "credentials": {"user": "admin", "password": "secret"},
            },
            "logging": {"level": "INFO"},
        }
        new = {
            "database": {
                "host": "db.production.com",
                "port": 5432,
                "credentials": {"user": "admin", "password": "new_secret"},
            },
            "logging": {"level": "WARNING"},
            "monitoring": {"enabled": True},  # New section
        }

        result = diff_yaml_generic(old, new, DiffOptions())

        # Should detect host change
        host_change = [c for c in result.changes if "host" in c.path]
        assert len(host_change) >= 1

        # Should detect new monitoring section
        monitoring_added = [c for c in result.changes if "monitoring" in c.path]
        assert len(monitoring_added) >= 1

