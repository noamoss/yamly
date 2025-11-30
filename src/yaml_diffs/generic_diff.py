"""Generic YAML diffing engine for arbitrary YAML structures."""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from yaml_diffs.generic_diff_types import (
    DiffOptions,
    GenericChangeType,
    GenericDiff,
    GenericDiffResult,
    IdentityRule,
)

# Common identity field names to auto-detect (in priority order)
IDENTITY_FIELD_CANDIDATES = ["id", "_id", "uuid", "key", "name", "host", "hostname"]


@dataclass
class DiffContext:
    """Context for collecting unmatched items during diffing."""

    removed_keys: list[tuple[str, str, Any]] = field(default_factory=list)  # (path, key, value)
    added_keys: list[tuple[str, str, Any]] = field(default_factory=list)  # (path, key, value)
    removed_items: list[tuple[str, Any, str | None]] = field(
        default_factory=list
    )  # (path, item, identity_value)
    added_items: list[tuple[str, Any, str | None]] = field(
        default_factory=list
    )  # (path, item, identity_value)


def get_identity_field_for_item(
    item: Any, parent_key: str, rules: list[IdentityRule]
) -> str | None:
    """Get identity field for a specific item, checking conditional rules.

    Priority:
    1. Conditional rules (most specific)
    2. Unconditional rules
    3. Auto-detection fallback

    Args:
        item: The array item to get identity field for
        parent_key: The name of the array this item belongs to
        rules: List of identity rules to check

    Returns:
        Identity field name if found, None otherwise
    """
    if not isinstance(item, dict):
        return None

    # 1. Check CONDITIONAL rules first (most specific)
    for rule in rules:
        if rule.array == parent_key and rule.when_field and rule.when_value:
            if item.get(rule.when_field) == rule.when_value:
                if rule.identity_field in item:
                    return rule.identity_field

    # 2. Check UNCONDITIONAL rules
    for rule in rules:
        if rule.array == parent_key and not rule.when_field:
            if rule.identity_field in item:
                return rule.identity_field

    # 3. Fall back to AUTO-DETECTION
    for candidate in IDENTITY_FIELD_CANDIDATES:
        if candidate in item:
            return candidate

    return None


def _auto_detect_identity_field(items: list[Any]) -> str | None:
    """Auto-detect identity field from common candidates.

    Args:
        items: List of items to check

    Returns:
        Identity field name if found, None otherwise
    """
    if not items:
        return None

    # Only check if all items are dicts
    if not all(isinstance(item, dict) for item in items):
        return None

    for candidate in IDENTITY_FIELD_CANDIDATES:
        if all(candidate in item for item in items):
            return candidate

    return None


def _calculate_similarity(obj1: Any, obj2: Any) -> float:
    """Calculate structural similarity between two objects (0.0 to 1.0).

    Uses JSON serialization and word-based Jaccard similarity.
    For very large objects (>10KB), uses simple equality check for performance.

    Args:
        obj1: First object
        obj2: Second object

    Returns:
        Similarity score between 0.0 and 1.0
    """
    if obj1 == obj2:
        return 1.0

    # Skip similarity for very large objects (performance optimization)
    try:
        size1 = len(str(obj1))
        size2 = len(str(obj2))
        if size1 > 10000 or size2 > 10000:  # Configurable threshold (10KB)
            # For very large objects, use simple equality check
            return 1.0 if obj1 == obj2 else 0.0
    except (TypeError, ValueError):
        pass

    try:
        # Serialize to JSON strings
        str1 = json.dumps(obj1, sort_keys=True)
        str2 = json.dumps(obj2, sort_keys=True)

        # Word-based Jaccard similarity
        words1 = set(str1.split())
        words2 = set(str2.split())

        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        if not union:
            return 1.0

        return len(intersection) / len(union)
    except (TypeError, ValueError):
        # If serialization fails, fall back to equality check
        return 1.0 if obj1 == obj2 else 0.0


def _normalize_path(path: str) -> str:
    """Normalize path to remove leading/trailing dots.

    Args:
        path: Path string

    Returns:
        Normalized path
    """
    return path.strip(".")


def diff_sequence(
    old_items: list[Any],
    new_items: list[Any],
    path: str,
    parent_key: str,
    options: DiffOptions,
    ctx: DiffContext,
) -> list[GenericDiffResult]:
    """Match array items using 4-phase algorithm.

    Phase 1: Identity field matching
    Phase 2: Content similarity (90% then 70% threshold)
    Phase 3: Positional fallback for identical duplicates
    Phase 4: Classify remaining as ADDED/REMOVED

    Args:
        old_items: Items from old version
        new_items: Items from new version
        path: Path to this array
        parent_key: Name of this array
        options: Diff options including identity rules
        ctx: Diff context for collecting unmatched items

    Returns:
        List of changes detected
    """
    changes: list[GenericDiffResult] = []
    matched_old_indices: set[int] = set()
    matched_new_indices: set[int] = set()

    # PHASE 1: Identity field matching
    old_by_identity: dict[tuple[str, Any], tuple[int, Any]] = {}  # (field, value) -> (index, item)
    new_by_identity: dict[tuple[str, Any], tuple[int, Any]] = {}

    for idx, item in enumerate(old_items):
        id_field = get_identity_field_for_item(item, parent_key, options.identity_rules)
        if id_field and isinstance(item, dict) and id_field in item:
            key = (id_field, item[id_field])
            old_by_identity[key] = (idx, item)

    for idx, item in enumerate(new_items):
        id_field = get_identity_field_for_item(item, parent_key, options.identity_rules)
        if id_field and isinstance(item, dict) and id_field in item:
            key = (id_field, item[id_field])
            new_by_identity[key] = (idx, item)

    # Match by identity
    for identity_key in old_by_identity.keys() & new_by_identity.keys():
        old_idx, old_item = old_by_identity[identity_key]
        new_idx, new_item = new_by_identity[identity_key]
        matched_old_indices.add(old_idx)
        matched_new_indices.add(new_idx)

        # Recurse to find nested changes
        # Note: Path uses old index for consistency, even when items are matched by identity
        # and might be at different positions in the new array. This ensures stable paths
        # for tracking changes across versions.
        item_path = f"{path}[{old_idx}]"
        nested_changes = diff_node(old_item, new_item, item_path, parent_key, options, ctx)

        if nested_changes:
            # Item changed
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.ITEM_CHANGED,
                    path=item_path,
                    old_value=old_item,
                    new_value=new_item,
                )
            )
            changes.extend(nested_changes)
        else:
            # Item unchanged
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.UNCHANGED,
                    path=item_path,
                    old_value=old_item,
                    new_value=new_item,
                )
            )

    # PHASE 2: Content similarity for unmatched items
    unmatched_old = [
        (idx, item) for idx, item in enumerate(old_items) if idx not in matched_old_indices
    ]
    unmatched_new = [
        (idx, item) for idx, item in enumerate(new_items) if idx not in matched_new_indices
    ]

    # Try 90% threshold first, then 70%
    for threshold in [0.90, 0.70]:
        remaining_old = []
        remaining_new = []

        for old_idx, old_item in unmatched_old:
            if old_idx in matched_old_indices:
                continue

            best_match: tuple[int, Any] | None = None
            best_similarity = 0.0

            for new_idx, new_item in unmatched_new:
                if new_idx in matched_new_indices:
                    continue

                similarity = _calculate_similarity(old_item, new_item)
                if similarity >= threshold and similarity > best_similarity:
                    best_match = (new_idx, new_item)
                    best_similarity = similarity

            if best_match:
                new_idx, new_item = best_match
                matched_old_indices.add(old_idx)
                matched_new_indices.add(new_idx)

                # Recurse to find nested changes
                item_path = f"{path}[{old_idx}]"
                nested_changes = diff_node(old_item, new_item, item_path, parent_key, options, ctx)

                if nested_changes or best_similarity < 1.0:
                    changes.append(
                        GenericDiffResult(
                            change_type=GenericChangeType.ITEM_CHANGED,
                            path=item_path,
                            old_value=old_item,
                            new_value=new_item,
                        )
                    )
                    changes.extend(nested_changes)
                else:
                    changes.append(
                        GenericDiffResult(
                            change_type=GenericChangeType.UNCHANGED,
                            path=item_path,
                            old_value=old_item,
                            new_value=new_item,
                        )
                    )
            else:
                remaining_old.append((old_idx, old_item))

        unmatched_old = remaining_old
        unmatched_new = [
            (idx, item) for idx, item in unmatched_new if idx not in matched_new_indices
        ]

    # PHASE 3: Positional fallback for identical items
    remaining_old = [
        (idx, item) for idx, item in enumerate(old_items) if idx not in matched_old_indices
    ]
    remaining_new = [
        (idx, item) for idx, item in enumerate(new_items) if idx not in matched_new_indices
    ]

    # Match identical items by position
    for i, (old_idx, old_item) in enumerate(remaining_old):
        if i < len(remaining_new):
            new_idx, new_item = remaining_new[i]
            if old_item == new_item:
                matched_old_indices.add(old_idx)
                matched_new_indices.add(new_idx)
                item_path = f"{path}[{old_idx}]"
                changes.append(
                    GenericDiffResult(
                        change_type=GenericChangeType.UNCHANGED,
                        path=item_path,
                        old_value=old_item,
                        new_value=new_item,
                    )
                )

    # PHASE 4: Classify remaining as ADDED/REMOVED
    for old_idx, old_item in enumerate(old_items):
        if old_idx not in matched_old_indices:
            item_path = f"{path}[{old_idx}]"
            id_field = get_identity_field_for_item(old_item, parent_key, options.identity_rules)
            identity_value = None
            if id_field and isinstance(old_item, dict) and id_field in old_item:
                identity_value = str(old_item[id_field])
            ctx.removed_items.append((item_path, old_item, identity_value))
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.ITEM_REMOVED,
                    path=item_path,
                    old_value=old_item,
                )
            )

    for new_idx, new_item in enumerate(new_items):
        if new_idx not in matched_new_indices:
            item_path = f"{path}[{new_idx}]"
            id_field = get_identity_field_for_item(new_item, parent_key, options.identity_rules)
            identity_value = None
            if id_field and isinstance(new_item, dict) and id_field in new_item:
                identity_value = str(new_item[id_field])
            ctx.added_items.append((item_path, new_item, identity_value))
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.ITEM_ADDED,
                    path=item_path,
                    new_value=new_item,
                )
            )

    return changes


def diff_node(
    old: Any,
    new: Any,
    path: str,
    parent_key: str,
    options: DiffOptions,
    ctx: DiffContext,
) -> list[GenericDiffResult]:
    """Recursively diff any YAML node at any nesting level.

    Args:
        old: Old node value
        new: New node value
        path: Current path to this node
        parent_key: Parent key name (for arrays)
        options: Diff options
        ctx: Diff context

    Returns:
        List of changes detected
    """
    changes: list[GenericDiffResult] = []
    path = _normalize_path(path)

    # Type mismatch
    old_type = type(old).__name__
    new_type = type(new).__name__
    if old_type != new_type:
        changes.append(
            GenericDiffResult(
                change_type=GenericChangeType.TYPE_CHANGED,
                path=path,
                old_value=old,
                new_value=new,
            )
        )
        return changes

    # Both are mappings (dicts)
    if isinstance(old, dict) and isinstance(new, dict):
        all_keys = set(old.keys()) | set(new.keys())

        for key in all_keys:
            key_path = f"{path}.{key}" if path else key

            if key in old and key in new:
                # Recurse deeper
                nested_changes = diff_node(old[key], new[key], key_path, key, options, ctx)
                changes.extend(nested_changes)
            elif key in new:
                # Key added
                ctx.added_keys.append((path, key, new[key]))
                changes.append(
                    GenericDiffResult(
                        change_type=GenericChangeType.KEY_ADDED,
                        path=key_path,
                        new_key=key,
                        new_value=new[key],
                    )
                )
            else:
                # Key removed
                ctx.removed_keys.append((path, key, old[key]))
                changes.append(
                    GenericDiffResult(
                        change_type=GenericChangeType.KEY_REMOVED,
                        path=key_path,
                        old_key=key,
                        old_value=old[key],
                    )
                )

    # Both are sequences (lists)
    elif isinstance(old, list) and isinstance(new, list):
        seq_changes = diff_sequence(old, new, path, parent_key, options, ctx)
        changes.extend(seq_changes)

    # Both are scalars
    else:
        if old != new:
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.VALUE_CHANGED,
                    path=path,
                    old_value=old,
                    new_value=new,
                )
            )
        else:
            changes.append(
                GenericDiffResult(
                    change_type=GenericChangeType.UNCHANGED,
                    path=path,
                    old_value=old,
                    new_value=new,
                )
            )

    return changes


def detect_renames(changes: list[GenericDiffResult], ctx: DiffContext) -> list[GenericDiffResult]:
    """Detect KEY_RENAMED by matching removed+added keys with similar values.

    Args:
        changes: Current list of changes
        ctx: Diff context with removed/added keys

    Returns:
        Updated list of changes with renames detected
    """
    # Group removed/added keys by parent path
    removed_by_path: dict[str, list[tuple[str, Any]]] = defaultdict(list)
    added_by_path: dict[str, list[tuple[str, Any]]] = defaultdict(list)

    for path, key, value in ctx.removed_keys:
        removed_by_path[path].append((key, value))

    for path, key, value in ctx.added_keys:
        added_by_path[path].append((key, value))

    # Find renames at each parent path
    rename_pairs: list[tuple[GenericDiffResult, GenericDiffResult]] = []

    for parent_path in removed_by_path.keys() & added_by_path.keys():
        removed_list = removed_by_path[parent_path]
        added_list = added_by_path[parent_path]

        for old_key, old_value in removed_list:
            for new_key, new_value in added_list:
                # Check if values are identical or very similar
                similarity = _calculate_similarity(old_value, new_value)
                if similarity >= 0.90:
                    # Found a rename
                    old_path = f"{parent_path}.{old_key}" if parent_path else old_key
                    new_path = f"{parent_path}.{new_key}" if parent_path else new_key

                    # Find the corresponding KEY_REMOVED and KEY_ADDED changes
                    old_change = next(
                        (
                            c
                            for c in changes
                            if c.change_type == GenericChangeType.KEY_REMOVED
                            and c.path == old_path
                            and c.old_key == old_key
                        ),
                        None,
                    )
                    new_change = next(
                        (
                            c
                            for c in changes
                            if c.change_type == GenericChangeType.KEY_ADDED
                            and c.path == new_path
                            and c.new_key == new_key
                        ),
                        None,
                    )

                    if old_change and new_change:
                        rename_pairs.append((old_change, new_change))

    # Replace KEY_REMOVED + KEY_ADDED with KEY_RENAMED
    updated_changes = []
    rename_old_paths = {old.path for old, _ in rename_pairs}
    rename_new_paths = {new.path for _, new in rename_pairs}

    for change in changes:
        if change.path in rename_old_paths or change.path in rename_new_paths:
            # Skip the old KEY_REMOVED and KEY_ADDED, we'll add KEY_RENAMED instead
            continue
        updated_changes.append(change)

    # Add KEY_RENAMED changes
    for old_change, new_change in rename_pairs:
        updated_changes.append(
            GenericDiffResult(
                change_type=GenericChangeType.KEY_RENAMED,
                path=old_change.path,
                old_key=old_change.old_key,
                new_key=new_change.new_key,
                old_value=old_change.old_value,
                new_value=new_change.new_value,
            )
        )

    return updated_changes


def detect_moves(changes: list[GenericDiffResult], ctx: DiffContext) -> list[GenericDiffResult]:
    """Detect KEY_MOVED and ITEM_MOVED by matching removed vs added globally.

    Args:
        changes: Current list of changes
        ctx: Diff context with removed/added items

    Returns:
        Updated list of changes with moves detected
    """
    updated_changes = changes.copy()

    # Detect KEY_MOVED
    moved_key_pairs: list[tuple[GenericDiffResult, GenericDiffResult]] = []

    for old_path, old_key, old_value in ctx.removed_keys:
        # Skip if already handled as rename
        if any(
            c.change_type == GenericChangeType.KEY_RENAMED
            and c.old_key == old_key
            and c.old_value == old_value
            for c in changes
        ):
            continue

        # Look for matching added key with same key name and similar value
        for new_path, new_key, new_value in ctx.added_keys:
            if old_key == new_key:
                similarity = _calculate_similarity(old_value, new_value)
                if similarity >= 0.90 and old_path != new_path:
                    # Found a move
                    old_change = next(
                        (
                            c
                            for c in changes
                            if c.change_type == GenericChangeType.KEY_REMOVED
                            and c.path == old_path
                            and c.old_key == old_key
                        ),
                        None,
                    )
                    new_change = next(
                        (
                            c
                            for c in changes
                            if c.change_type == GenericChangeType.KEY_ADDED
                            and c.path == new_path
                            and c.new_key == new_key
                        ),
                        None,
                    )

                    if old_change and new_change:
                        moved_key_pairs.append((old_change, new_change))
                        break

    # Replace KEY_REMOVED + KEY_ADDED with KEY_MOVED
    moved_old_paths = {old.path for old, _ in moved_key_pairs}
    moved_new_paths = {new.path for _, new in moved_key_pairs}

    updated_changes = [
        c
        for c in updated_changes
        if c.path not in moved_old_paths and c.path not in moved_new_paths
    ]

    for old_change, new_change in moved_key_pairs:
        updated_changes.append(
            GenericDiffResult(
                change_type=GenericChangeType.KEY_MOVED,
                path=old_change.path,
                old_path=old_change.path,
                new_path=new_change.path,
                old_key=old_change.old_key,
                old_value=old_change.old_value,
                new_value=new_change.new_value,
            )
        )

    # Detect ITEM_MOVED
    moved_item_pairs: list[tuple[GenericDiffResult, GenericDiffResult]] = []

    for old_path, _old_item, old_identity in ctx.removed_items:
        if old_identity is None:
            continue

        # Look for matching added item with same identity
        for new_path, _new_item, new_identity in ctx.added_items:
            if old_identity == new_identity and old_path != new_path:
                # Found a move
                old_change = next(
                    (
                        c
                        for c in changes
                        if c.change_type == GenericChangeType.ITEM_REMOVED and c.path == old_path
                    ),
                    None,
                )
                new_change = next(
                    (
                        c
                        for c in changes
                        if c.change_type == GenericChangeType.ITEM_ADDED and c.path == new_path
                    ),
                    None,
                )

                if old_change and new_change:
                    moved_item_pairs.append((old_change, new_change))
                    break

    # Replace ITEM_REMOVED + ITEM_ADDED with ITEM_MOVED
    moved_item_old_paths = {old.path for old, _ in moved_item_pairs}
    moved_item_new_paths = {new.path for _, new in moved_item_pairs}

    updated_changes = [
        c
        for c in updated_changes
        if c.path not in moved_item_old_paths and c.path not in moved_item_new_paths
    ]

    for old_change, new_change in moved_item_pairs:
        updated_changes.append(
            GenericDiffResult(
                change_type=GenericChangeType.ITEM_MOVED,
                path=old_change.path,
                old_path=old_change.path,
                new_path=new_change.path,
                old_value=old_change.old_value,
                new_value=new_change.new_value,
            )
        )

    return updated_changes


def diff_yaml_generic(
    old: dict[str, Any], new: dict[str, Any], options: DiffOptions
) -> GenericDiff:
    """Full generic YAML diff with RENAMED and MOVED detection.

    Implements 3-phase algorithm:
    1. Recursive local diff
    2. Rename detection
    3. Global move detection

    Args:
        old: Old YAML document (parsed dict)
        new: New YAML document (parsed dict)
        options: Diff options including identity rules

    Returns:
        GenericDiff with all detected changes
    """
    # Context to collect unmatched items for global matching
    ctx = DiffContext()

    # Phase 1: Recursive local diff
    changes = diff_node(old, new, "", "", options, ctx)

    # Phase 2: Rename detection (convert KEY_REMOVED+KEY_ADDED pairs)
    changes = detect_renames(changes, ctx)

    # Phase 3: Global move detection
    changes = detect_moves(changes, ctx)

    # Calculate counts
    counts = {
        "value_changed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.VALUE_CHANGED
        ),
        "key_added_count": sum(1 for c in changes if c.change_type == GenericChangeType.KEY_ADDED),
        "key_removed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.KEY_REMOVED
        ),
        "key_renamed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.KEY_RENAMED
        ),
        "key_moved_count": sum(1 for c in changes if c.change_type == GenericChangeType.KEY_MOVED),
        "item_added_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.ITEM_ADDED
        ),
        "item_removed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.ITEM_REMOVED
        ),
        "item_changed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.ITEM_CHANGED
        ),
        "item_moved_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.ITEM_MOVED
        ),
        "type_changed_count": sum(
            1 for c in changes if c.change_type == GenericChangeType.TYPE_CHANGED
        ),
    }

    return GenericDiff(changes=changes, **counts)


def enrich_generic_diff_with_line_numbers(
    diff: GenericDiff,
    old_yaml: str,
    new_yaml: str,
) -> None:
    """Enrich generic diff results with line numbers.

    Mutates the diff in place, populating old_line_number and
    new_line_number based on the path in each change.

    Args:
        diff: GenericDiff to enrich
        old_yaml: Old YAML document as string
        new_yaml: New YAML document as string
    """
    from yaml_diffs.generic_diff_types import GenericChangeType
    from yaml_diffs.yaml_extract import find_path_line_number

    for change in diff.changes:
        # Determine which path to use for old/new line lookup
        old_path = change.old_path or change.path
        new_path = change.new_path or change.path

        # Populate line numbers based on change type
        if change.change_type in (
            GenericChangeType.KEY_REMOVED,
            GenericChangeType.ITEM_REMOVED,
        ):
            change.old_line_number = find_path_line_number(old_yaml, old_path)
        elif change.change_type in (
            GenericChangeType.KEY_ADDED,
            GenericChangeType.ITEM_ADDED,
        ):
            change.new_line_number = find_path_line_number(new_yaml, new_path)
        else:
            # For other change types, try to find line numbers in both documents
            change.old_line_number = find_path_line_number(old_yaml, old_path)
            change.new_line_number = find_path_line_number(new_yaml, new_path)
