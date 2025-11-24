"""Tests to verify and fix bugs in diffing logic."""

import pytest

from yaml_diffs.diff import diff_documents
from yaml_diffs.diff_types import ChangeType
from yaml_diffs.models import Document, DocumentType, Section, Source, Version


@pytest.fixture
def minimal_document() -> Document:
    """Create a minimal document."""
    return Document(
        id="law-1234",
        title="חוק הדוגמה",
        type=DocumentType.LAW,
        version=Version(number="1.0"),
        source=Source(url="https://example.com/law", fetched_at="2025-01-20T09:50:00Z"),
    )


class TestBug1CartesianProduct:
    """Test Bug 1: Cartesian product issue in _find_moved_sections."""

    def test_multiple_sections_same_marker_one_to_one_matching(self, minimal_document: Document):
        """Test that multiple sections with same marker are matched one-to-one, not cartesian product."""
        # Old document: Two sections with marker "1" under different parents
        old_doc = Document(
            id=minimal_document.id,
            title=minimal_document.title,
            type=minimal_document.type,
            version=minimal_document.version,
            source=minimal_document.source,
            sections=[
                Section(
                    id="chap-1",
                    marker="פרק א'",
                    content="",
                    sections=[
                        Section(id="sec-1", marker="1", content="Section 1"),
                    ],
                ),
                Section(
                    id="chap-2",
                    marker="פרק ב'",
                    content="",
                    sections=[
                        Section(id="sec-2", marker="1", content="Section 2"),
                    ],
                ),
            ],
        )

        # New document: Two sections with marker "1" under different parents (moved)
        new_doc = Document(
            id=old_doc.id,
            title=old_doc.title,
            type=old_doc.type,
            version=old_doc.version,
            source=old_doc.source,
            sections=[
                Section(
                    id="chap-3",
                    marker="פרק ג'",
                    content="",
                    sections=[
                        Section(id="sec-1", marker="1", content="Section 1"),
                    ],
                ),
                Section(
                    id="chap-4",
                    marker="פרק ד'",
                    content="",
                    sections=[
                        Section(id="sec-2", marker="1", content="Section 2"),
                    ],
                ),
            ],
        )

        diff = diff_documents(old_doc, new_doc)

        # Should have exactly 2 MOVED changes (one-to-one matching)
        # NOT 4 (cartesian product: 2 old × 2 new = 4)
        moved_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_MOVED]
        assert len(moved_changes) == 2, f"Expected 2 MOVED changes, got {len(moved_changes)}"
        assert diff.moved_count == 2, f"Expected moved_count=2, got {diff.moved_count}"


class TestBug2MovedRenamed:
    """Test Bug 2: Moved sections with title changes should record both MOVED and RENAMED."""

    def test_moved_section_with_title_change_only(self, minimal_document: Document):
        """Test that moved section with only title change records both MOVED and RENAMED."""
        old_doc = Document(
            id=minimal_document.id,
            title=minimal_document.title,
            type=minimal_document.type,
            version=minimal_document.version,
            source=minimal_document.source,
            sections=[
                Section(
                    id="chap-1",
                    marker="פרק א'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="Same content",
                            title="Old Title",
                        ),
                    ],
                ),
            ],
        )

        new_doc = Document(
            id=old_doc.id,
            title=old_doc.title,
            type=old_doc.type,
            version=old_doc.version,
            source=old_doc.source,
            sections=[
                Section(
                    id="chap-2",
                    marker="פרק ב'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="Same content",  # Same content
                            title="New Title",  # Title changed
                        ),
                    ],
                ),
            ],
        )

        diff = diff_documents(old_doc, new_doc)

        # With new semantics: title changed, so not detected as MOVED
        # (MOVED requires title+content to be same)
        # Should be detected as SECTION_REMOVED + SECTION_ADDED
        moved_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_MOVED]
        removed_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_REMOVED]
        added_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_ADDED]

        assert len(moved_changes) == 0, "Title changed, so not detected as MOVED"
        assert len(removed_changes) == 2  # Parent chapter + child section
        assert len(added_changes) == 2  # New parent chapter + new child section


class TestBug3MovedContentChanged:
    """Test Bug 3: Moved sections with content changes should always record CONTENT_CHANGED."""

    def test_moved_section_with_content_and_title_change(self, minimal_document: Document):
        """Test that moved section with both content and title change records MOVED, RENAMED, and CONTENT_CHANGED."""
        # This test addresses the specific issue from comment #2554771461:
        # "Moving marker '1' to a new parent with different text and a new title
        # currently produces no content-change entry despite the text change."
        old_doc = Document(
            id=minimal_document.id,
            title=minimal_document.title,
            type=minimal_document.type,
            version=minimal_document.version,
            source=minimal_document.source,
            sections=[
                Section(
                    id="chap-1",
                    marker="פרק א'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="Original content for section one.",
                            title="Original Title",
                        ),
                    ],
                ),
            ],
        )

        new_doc = Document(
            id=old_doc.id,
            title=old_doc.title,
            type=old_doc.type,
            version=old_doc.version,
            source=old_doc.source,
            sections=[
                Section(
                    id="chap-2",
                    marker="פרק ב'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="Completely different content after move.",  # Different text
                            title="New Title",  # Title also changed
                        ),
                    ],
                ),
            ],
        )

        diff = diff_documents(old_doc, new_doc)

        # With new semantics: content and title changed, so not detected as MOVED
        # (MOVED requires title+content to be same)
        # Should be detected as SECTION_REMOVED + SECTION_ADDED
        moved_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_MOVED]
        removed_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_REMOVED]
        added_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_ADDED]

        assert len(moved_changes) == 0, "Content and title changed, so not detected as MOVED"
        assert len(removed_changes) == 2  # Parent chapter + child section
        assert len(added_changes) == 2  # New parent chapter + new child section

    def test_moved_section_with_substantially_rewritten_content(self, minimal_document: Document):
        """Test that section with low content similarity is not detected as MOVED.

        With new semantics, SECTION_MOVED requires high content similarity (≥0.95) and same title.
        If content is substantially rewritten (low similarity), it should be detected as
        SECTION_REMOVED + SECTION_ADDED instead.
        """
        old_doc = Document(
            id=minimal_document.id,
            title=minimal_document.title,
            type=minimal_document.type,
            version=minimal_document.version,
            source=minimal_document.source,
            sections=[
                Section(
                    id="chap-1",
                    marker="פרק א'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="The quick brown fox jumps over the lazy dog.",
                            title="Section Title",
                        ),
                    ],
                ),
            ],
        )

        new_doc = Document(
            id=old_doc.id,
            title=old_doc.title,
            type=old_doc.type,
            version=old_doc.version,
            source=old_doc.source,
            sections=[
                Section(
                    id="chap-2",
                    marker="פרק ב'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="A completely different sentence with no shared words.",  # Low similarity
                            title="Section Title",  # Same title
                        ),
                    ],
                ),
            ],
        )

        diff = diff_documents(old_doc, new_doc)

        # With new semantics: low similarity, so not detected as MOVED
        # Should be detected as SECTION_REMOVED + SECTION_ADDED
        moved_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_MOVED]
        removed_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_REMOVED]
        added_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_ADDED]

        assert len(moved_changes) == 0, "Low similarity should not be detected as MOVED"
        assert len(removed_changes) == 2  # Parent chapter + child section
        assert len(added_changes) == 2  # New parent chapter + new child section


class TestSectionMovedWithMarkerChange:
    """Test SECTION_MOVED detection with marker changes."""

    def test_section_moved_with_marker_change(self, minimal_document: Document):
        """Test that SECTION_MOVED is detected when marker changed but content+title same."""
        old_doc = Document(
            id=minimal_document.id,
            title=minimal_document.title,
            type=minimal_document.type,
            version=minimal_document.version,
            source=minimal_document.source,
            sections=[
                Section(
                    id="chap-1",
                    marker="פרק א'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="1",
                            content="Same content here",
                            title="Same Title",
                        ),
                    ],
                ),
            ],
        )

        new_doc = Document(
            id=old_doc.id,
            title=old_doc.title,
            type=old_doc.type,
            version=old_doc.version,
            source=old_doc.source,
            sections=[
                Section(
                    id="chap-2",
                    marker="פרק ב'",
                    content="",
                    sections=[
                        Section(
                            id="sec-1",
                            marker="2",  # Marker changed
                            content="Same content here",  # Content same
                            title="Same Title",  # Title same
                        ),
                    ],
                ),
            ],
        )

        diff = diff_documents(old_doc, new_doc)

        # Should detect SECTION_MOVED (path changed, marker changed, but content+title same)
        moved_changes = [c for c in diff.changes if c.change_type == ChangeType.SECTION_MOVED]
        assert len(moved_changes) == 1, f"Expected 1 SECTION_MOVED, got {len(moved_changes)}"
        assert diff.moved_count == 1
        assert moved_changes[0].old_marker_path == ("פרק א'", "1")
        assert moved_changes[0].new_marker_path == ("פרק ב'", "2")
