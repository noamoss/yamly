"""Document diffing engine using marker-based matching."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import uuid4

from yamly.diff_types import ChangeType, DiffResult, DocumentDiff
from yamly.models import Document, Section

if TYPE_CHECKING:
    # Type aliases for marker map structure
    MarkerMapKey = tuple[str, tuple[str, ...]]
    MarkerMapValue = tuple[Section, tuple[str, ...], list[str]]
    MarkerMap = dict[MarkerMapKey, MarkerMapValue]


def _validate_unique_markers(
    sections: list[Section],
    parent_path: tuple[str, ...] = (),
) -> None:
    """Validate no duplicate markers at same nesting level.

    Recursively validates that no two sections at the same nesting level
    have the same marker. Raises ValueError if duplicates are found.

    Args:
        sections: List of sections to validate
        parent_path: Tuple of parent markers from root (for error messages)

    Raises:
        ValueError: If duplicate markers found at same level

    Examples:
        >>> section1 = Section(id="1", marker="1", content="")
        >>> section2 = Section(id="2", marker="1", content="")  # Duplicate!
        >>> _validate_unique_markers([section1, section2])
        ValueError: Duplicate marker "1" found at path ()
    """
    seen_markers: set[str] = set()
    for section in sections:
        if section.marker in seen_markers:
            path_str = " -> ".join(parent_path) if parent_path else "root"
            raise ValueError(f'Duplicate marker "{section.marker}" found at path: {path_str}')
        seen_markers.add(section.marker)

        # Recursively validate nested sections
        if section.sections:
            new_path = parent_path + (section.marker,)
            _validate_unique_markers(section.sections, new_path)


def _build_marker_map(
    sections: list[Section],
    parent_marker_path: tuple[str, ...] = (),
    parent_id_path: list[str] | None = None,
) -> MarkerMap:
    """Build marker+path -> section mapping.

    Recursively traverses sections and builds a mapping from
    (marker, parent_marker_path) to (Section, marker_path, id_path).

    Args:
        sections: List of sections to map
        parent_marker_path: Tuple of parent markers from root
        parent_id_path: List of parent IDs from root (for tracking)

    Returns:
        Dictionary mapping (marker, parent_marker_path) to
        (Section, marker_path_tuple, id_path_list)

    Examples:
        >>> section = Section(id="sec-1", marker="1", content="")
        >>> mapping = _build_marker_map([section])
        >>> key = ("1", ())
        >>> assert key in mapping
    """
    if parent_id_path is None:
        parent_id_path = []

    mapping: MarkerMap = {}

    for section in sections:
        # Create key: (marker, parent_marker_path)
        key = (section.marker, parent_marker_path)

        # Create paths
        marker_path = parent_marker_path + (section.marker,)
        id_path = parent_id_path + [section.id]

        # Store mapping
        mapping[key] = (section, marker_path, id_path)

        # Recursively process nested sections
        if section.sections:
            nested_mapping = _build_marker_map(section.sections, marker_path, id_path)
            mapping.update(nested_mapping)

    return mapping


def _calculate_content_similarity(content1: str, content2: str) -> float:
    """Calculate similarity score between two content strings.

    Uses simple word overlap to calculate similarity.
    Returns a value between 0.0 (no similarity) and 1.0 (identical).

    Args:
        content1: First content string
        content2: Second content string

    Returns:
        Similarity score between 0.0 and 1.0

    Examples:
        >>> _calculate_content_similarity("hello world", "hello world")
        1.0
        >>> _calculate_content_similarity("hello", "world")
        0.0
    """
    if not content1 and not content2:
        return 1.0
    if not content1 or not content2:
        return 0.0

    # Simple word-based similarity
    words1 = set(content1.split())
    words2 = set(content2.split())

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    union = words1 | words2

    if not union:
        return 1.0

    return len(intersection) / len(union)


def _find_moved_sections(
    unmatched_old: MarkerMap,
    unmatched_new: MarkerMap,
) -> list[tuple[MarkerMapKey, MarkerMapKey]]:
    """Find sections that moved (different path, possibly different marker).

    Matches sections by content similarity (≥0.95 threshold) to detect movements,
    regardless of marker or title changes. Filters out empty content sections
    (parent sections) to avoid false positives. Uses best-match approach for
    one-to-one matching to avoid cartesian product issues.

    Note: Title differences don't prevent movement detection - they're tracked as
    a separate change type (TITLE_CHANGED) after movement is detected. A section
    can be detected as moved even if the title changed, as long as content
    similarity is ≥0.95.

    Args:
        unmatched_old: Dictionary of unmatched sections from old document
        unmatched_new: Dictionary of unmatched sections from new document

    Returns:
        List of (old_key, new_key) pairs for moved sections

    Examples:
        >>> # Same marker, different path
        >>> old_key = ("1", ("פרק א'",))
        >>> new_key = ("1", ("פרק ב'",))
        >>> matches = _find_moved_sections({old_key: ...}, {new_key: ...})
        >>> assert (old_key, new_key) in matches
        >>> # Different marker, same content
        >>> old_key = ("1", ())
        >>> new_key = ("2", ())
        >>> matches = _find_moved_sections({old_key: ...}, {new_key: ...})
        >>> assert (old_key, new_key) in matches
    """
    matches: list[tuple[MarkerMapKey, MarkerMapKey]] = []

    # Match all unmatched sections by content similarity (one-to-one matching)
    # Process old sections in order and find best match in new sections
    #
    # Performance note: This algorithm is O(n*m) where n is the number of unmatched
    # old sections and m is the number of unmatched new sections. This is necessary
    # to correctly detect movements when markers change. For most use cases, this
    # is acceptable since unmatched sections are typically a small subset of the
    # document. The previous marker-based approach was O(n) but couldn't handle
    # marker changes.
    for old_key in list(unmatched_old.keys()):
        old_section, old_marker_path, _ = unmatched_old[old_key]

        # Skip empty content sections (parent sections) to avoid false positives
        if not old_section.content:
            continue

        # Find best match in unmatched_new by content similarity
        best_match: MarkerMapKey | None = None
        best_similarity = 0.0

        for new_key in list(unmatched_new.keys()):
            new_section, new_marker_path, _ = unmatched_new[new_key]

            # Skip empty content sections
            if not new_section.content:
                continue

            # Check content similarity (≥0.95 threshold)
            # Note: Title changes are handled separately after movement detection
            similarity = _calculate_content_similarity(old_section.content, new_section.content)
            if similarity >= 0.95 and similarity > best_similarity:
                # Found a better match - update best match
                # Note: If multiple sections have identical similarity scores, the first
                # one encountered (based on iteration order) will be selected. This is
                # deterministic but worth noting if non-deterministic behavior would be
                # problematic for a use case.
                best_match = new_key
                best_similarity = similarity

        # If match found, add to matches and remove from unmatched sets
        if best_match is not None:
            matches.append((old_key, best_match))
            # Remove from unmatched sets to ensure one-to-one matching
            del unmatched_old[old_key]
            del unmatched_new[best_match]

    return matches


def _diff_document_metadata(old: Document, new: Document) -> list[DiffResult]:
    """Compare document metadata fields and detect changes.

    Args:
        old: Old document version
        new: New document version

    Returns:
        List of DiffResult entries for metadata changes
    """
    changes: list[DiffResult] = []

    # Diff version fields (handle None values)
    old_version_number = old.version.number if old.version else None
    new_version_number = new.version.number if new.version else None
    if old_version_number != new_version_number:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "version", "number"),
                new_marker_path=("__metadata__", "version", "number"),
                old_content=old_version_number or "",
                new_content=new_version_number or "",
            )
        )
    old_version_description = old.version.description if old.version else None
    new_version_description = new.version.description if new.version else None
    if old_version_description != new_version_description:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "version", "description"),
                new_marker_path=("__metadata__", "version", "description"),
                old_content=old_version_description or "",
                new_content=new_version_description or "",
            )
        )

    # Diff source fields (handle None values)
    old_source_url = old.source.url if old.source else None
    new_source_url = new.source.url if new.source else None
    if old_source_url != new_source_url:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "source", "url"),
                new_marker_path=("__metadata__", "source", "url"),
                old_content=old_source_url or "",
                new_content=new_source_url or "",
            )
        )
    old_source_fetched_at = old.source.fetched_at if old.source else None
    new_source_fetched_at = new.source.fetched_at if new.source else None
    if old_source_fetched_at != new_source_fetched_at:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "source", "fetched_at"),
                new_marker_path=("__metadata__", "source", "fetched_at"),
                old_content=old_source_fetched_at or "",
                new_content=new_source_fetched_at or "",
            )
        )

    # Diff authors
    old_authors_str = ", ".join(old.authors) if old.authors else ""
    new_authors_str = ", ".join(new.authors) if new.authors else ""
    if old_authors_str != new_authors_str:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "authors"),
                new_marker_path=("__metadata__", "authors"),
                old_content=old_authors_str,
                new_content=new_authors_str,
            )
        )

    # Diff dates
    if old.published_date != new.published_date:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "published_date"),
                new_marker_path=("__metadata__", "published_date"),
                old_content=old.published_date or "",
                new_content=new.published_date or "",
            )
        )
    if old.updated_date != new.updated_date:
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id="__metadata__",
                change_type=ChangeType.CONTENT_CHANGED,
                marker="__metadata__",
                old_marker_path=("__metadata__", "updated_date"),
                new_marker_path=("__metadata__", "updated_date"),
                old_content=old.updated_date or "",
                new_content=new.updated_date or "",
            )
        )

    return changes


def diff_documents(old: Document, new: Document) -> DocumentDiff:
    """Compare two Document versions and detect changes.

    Uses marker-based matching to detect additions, deletions, content changes,
    movements, and renames. Validates that markers are unique at each level.
    Also diffs document-level metadata.

    Args:
        old: Old document version
        new: New document version

    Returns:
        DocumentDiff containing all detected changes

    Raises:
        ValueError: If duplicate markers found at same level in either document

    Examples:
        >>> old_doc = Document(...)
        >>> new_doc = Document(...)
        >>> diff = diff_documents(old_doc, new_doc)
        >>> assert isinstance(diff, DocumentDiff)
    """
    # Validate unique markers in both documents
    _validate_unique_markers(old.sections)
    _validate_unique_markers(new.sections)

    # Build marker maps for both documents
    old_map = _build_marker_map(old.sections)
    new_map = _build_marker_map(new.sections)

    changes: list[DiffResult] = []

    # Find exact matches (same marker + same parent path)
    exact_matches: set[tuple[str, tuple[str, ...]]] = set()
    for key in old_map.keys() & new_map.keys():
        exact_matches.add(key)
        old_section, old_marker_path, old_id_path = old_map[key]
        new_section, new_marker_path, new_id_path = new_map[key]

        # Check for changes (using independent if statements to allow both
        # CONTENT_CHANGED and TITLE_CHANGED to be recorded when both change)
        content_changed = old_section.content != new_section.content
        title_changed = old_section.title != new_section.title

        if content_changed:
            changes.append(
                DiffResult(
                    id=str(uuid4()),
                    section_id=old_section.id,
                    change_type=ChangeType.CONTENT_CHANGED,
                    marker=old_section.marker,
                    old_marker_path=old_marker_path,
                    new_marker_path=new_marker_path,
                    old_id_path=old_id_path,
                    new_id_path=new_id_path,
                    old_content=old_section.content,
                    new_content=new_section.content,
                )
            )
        if title_changed:
            changes.append(
                DiffResult(
                    id=str(uuid4()),
                    section_id=old_section.id,
                    change_type=ChangeType.TITLE_CHANGED,
                    marker=old_section.marker,
                    old_marker_path=old_marker_path,
                    new_marker_path=new_marker_path,
                    old_id_path=old_id_path,
                    new_id_path=new_id_path,
                    old_title=old_section.title,
                    new_title=new_section.title,
                )
            )
        if not content_changed and not title_changed:
            changes.append(
                DiffResult(
                    id=str(uuid4()),
                    section_id=old_section.id,
                    change_type=ChangeType.UNCHANGED,
                    marker=old_section.marker,
                    old_marker_path=old_marker_path,
                    new_marker_path=new_marker_path,
                    old_id_path=old_id_path,
                    new_id_path=new_id_path,
                )
            )

    # Find unmatched sections (for movement detection)
    unmatched_old = {k: v for k, v in old_map.items() if k not in exact_matches}
    unmatched_new = {k: v for k, v in new_map.items() if k not in exact_matches}

    # Find moved sections (different path, possibly different marker)
    moved_matches = _find_moved_sections(unmatched_old, unmatched_new)

    for old_key, new_key in moved_matches:
        old_section, old_marker_path, old_id_path = old_map[old_key]
        new_section, new_marker_path, new_id_path = new_map[new_key]

        # Check if content and title changed
        content_changed = old_section.content != new_section.content
        title_changed = old_section.title != new_section.title

        # Add SECTION_MOVED change
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id=old_section.id,
                change_type=ChangeType.SECTION_MOVED,
                marker=old_section.marker,
                old_marker_path=old_marker_path,
                new_marker_path=new_marker_path,
                old_id_path=old_id_path,
                new_id_path=new_id_path,
                old_content=old_section.content,
                new_content=new_section.content,
                old_title=old_section.title,
                new_title=new_section.title,
            )
        )

        # BUG FIX: Check for title change. Moved sections with title changes should
        # record both MOVED and TITLE_CHANGED to be consistent with non-moved sections.
        # This ensures title change information is not lost when a section moves.
        # Both TITLE_CHANGED and CONTENT_CHANGED can be recorded when both change.
        if title_changed:
            changes.append(
                DiffResult(
                    id=str(uuid4()),
                    section_id=old_section.id,
                    change_type=ChangeType.TITLE_CHANGED,
                    marker=old_section.marker,
                    old_marker_path=old_marker_path,
                    new_marker_path=new_marker_path,
                    old_id_path=old_id_path,
                    new_id_path=new_id_path,
                    old_title=old_section.title,
                    new_title=new_section.title,
                )
            )

        # BUG FIX: Always detect content changes for moved sections, even when
        # title changes or content is substantially rewritten (similarity < 0.8).
        # Previously, CONTENT_CHANGED was only added when similarity >= 0.8 and
        # title unchanged, causing content edits to be lost in other cases.
        if content_changed:
            changes.append(
                DiffResult(
                    id=str(uuid4()),
                    section_id=old_section.id,
                    change_type=ChangeType.CONTENT_CHANGED,
                    marker=old_section.marker,
                    old_marker_path=old_marker_path,
                    new_marker_path=new_marker_path,
                    old_id_path=old_id_path,
                    new_id_path=new_id_path,
                    old_content=old_section.content,
                    new_content=new_section.content,
                )
            )

    # Remaining unmatched sections
    # Old only -> SECTION_REMOVED
    for _old_key, (old_section, old_marker_path, old_id_path) in unmatched_old.items():
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id=old_section.id,
                change_type=ChangeType.SECTION_REMOVED,
                marker=old_section.marker,
                old_marker_path=old_marker_path,
                old_id_path=old_id_path,
                old_content=old_section.content,
                old_title=old_section.title,
            )
        )

    # New only -> SECTION_ADDED
    for _new_key, (new_section, new_marker_path, new_id_path) in unmatched_new.items():
        changes.append(
            DiffResult(
                id=str(uuid4()),
                section_id=new_section.id,
                change_type=ChangeType.SECTION_ADDED,
                marker=new_section.marker,
                new_marker_path=new_marker_path,
                new_id_path=new_id_path,
                new_content=new_section.content,
                new_title=new_section.title,
            )
        )

    # Diff document metadata
    metadata_changes = _diff_document_metadata(old, new)
    changes.extend(metadata_changes)

    # Calculate counts
    added_count = sum(1 for c in changes if c.change_type == ChangeType.SECTION_ADDED)
    deleted_count = sum(1 for c in changes if c.change_type == ChangeType.SECTION_REMOVED)
    modified_count = sum(
        1
        for c in changes
        if c.change_type in (ChangeType.CONTENT_CHANGED, ChangeType.TITLE_CHANGED)
    )
    moved_count = sum(1 for c in changes if c.change_type == ChangeType.SECTION_MOVED)

    return DocumentDiff(
        changes=changes,
        added_count=added_count,
        deleted_count=deleted_count,
        modified_count=modified_count,
        moved_count=moved_count,
    )


def enrich_diff_with_yaml_extraction(
    diff: DocumentDiff,
    old_yaml: str | None = None,
    new_yaml: str | None = None,
) -> DocumentDiff:
    """Enrich diff results with section YAML and line numbers.

    This function extracts full section YAML and finds line numbers for each change,
    enriching the DiffResult objects with old_section_yaml, new_section_yaml,
    old_line_number, and new_line_number fields.

    Args:
        diff: DocumentDiff containing changes to enrich
        old_yaml: Optional raw YAML text of old document
        new_yaml: Optional raw YAML text of new document

    Returns:
        DocumentDiff with enriched changes (same object, modified in place)
    """
    from yamly.yaml_extract import (
        extract_section_yaml,
        find_metadata_line_number,
        find_section_content_line_number,
        find_section_line_number,
    )

    # Parse documents once if YAML provided
    old_parsed = None
    new_parsed = None
    if old_yaml:
        try:
            import yaml  # type: ignore[import-untyped]

            old_parsed = yaml.safe_load(old_yaml)
        except Exception:
            old_parsed = None
    if new_yaml:
        try:
            import yaml  # type: ignore[import-untyped]

            new_parsed = yaml.safe_load(new_yaml)
        except Exception:
            new_parsed = None

    # Enrich each change
    for change in diff.changes:
        # Check if this is a metadata change
        is_metadata = (
            change.marker == "__metadata__"
            or (change.old_marker_path and change.old_marker_path[0] == "__metadata__")
            or (change.new_marker_path and change.new_marker_path[0] == "__metadata__")
        )

        # Extract old section YAML and line number
        if old_yaml and change.old_marker_path:
            change.old_section_yaml = extract_section_yaml(
                old_yaml, change.old_marker_path, old_parsed
            )
            if is_metadata:
                change.old_line_number = find_metadata_line_number(old_yaml, change.old_marker_path)
            elif change.change_type == ChangeType.CONTENT_CHANGED:
                # For content changes, find the specific content: field line
                change.old_line_number = find_section_content_line_number(
                    old_yaml, change.old_marker_path, "content"
                )
            elif change.change_type == ChangeType.TITLE_CHANGED:
                # For title changes, find the specific title: field line
                change.old_line_number = find_section_content_line_number(
                    old_yaml, change.old_marker_path, "title"
                )
            else:
                change.old_line_number = find_section_line_number(old_yaml, change.old_marker_path)
        # Extract new section YAML and line number
        if new_yaml and change.new_marker_path:
            change.new_section_yaml = extract_section_yaml(
                new_yaml, change.new_marker_path, new_parsed
            )
            if is_metadata:
                change.new_line_number = find_metadata_line_number(new_yaml, change.new_marker_path)
            elif change.change_type == ChangeType.CONTENT_CHANGED:
                # For content changes, find the specific content: field line
                change.new_line_number = find_section_content_line_number(
                    new_yaml, change.new_marker_path, "content"
                )
            elif change.change_type == ChangeType.TITLE_CHANGED:
                # For title changes, find the specific title: field line
                change.new_line_number = find_section_content_line_number(
                    new_yaml, change.new_marker_path, "title"
                )
            else:
                change.new_line_number = find_section_line_number(new_yaml, change.new_marker_path)
    return diff
