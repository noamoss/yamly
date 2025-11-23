"""Tests for Pydantic models."""

import uuid

import pytest
import yaml
from pydantic import ValidationError

from yaml_diffs.models import Document, Section


# Test fixtures
@pytest.fixture
def sample_uuid() -> str:
    """Generate a sample UUID for testing."""
    return str(uuid.uuid4())


@pytest.fixture
def hebrew_text() -> str:
    """Sample Hebrew text for testing."""
    return "חוק יסוד: כבוד האדם וחירותו"


@pytest.fixture
def minimal_section(sample_uuid: str) -> Section:
    """Create a minimal section with only id."""
    return Section(id=sample_uuid)


@pytest.fixture
def full_section(sample_uuid: str, hebrew_text: str) -> Section:
    """Create a section with all fields."""
    return Section(
        id=sample_uuid,
        content=hebrew_text,
        marker="א",
        title="סעיף ראשון",
        sections=[],
    )


class TestSectionCreation:
    """Test Section model creation with various field combinations."""

    def test_create_section_with_all_fields(self, sample_uuid: str, hebrew_text: str):
        """Test creating Section with id, content, marker, title, sections."""
        section = Section(
            id=sample_uuid,
            content=hebrew_text,
            marker="א",
            title="סעיף ראשון",
            sections=[],
        )

        assert section.id == uuid.UUID(sample_uuid)
        assert section.content == hebrew_text
        assert section.marker == "א"
        assert section.title == "סעיף ראשון"
        assert section.sections == []
        assert isinstance(section.sections, list)

    def test_create_section_with_minimal_fields(self, sample_uuid: str):
        """Test creating Section with only id provided."""
        section = Section(id=sample_uuid)

        assert section.id == uuid.UUID(sample_uuid)
        assert section.content == ""  # Should default to empty string
        assert section.marker is None
        assert section.title is None
        assert section.sections == []

    def test_nested_sections_deep_nesting(self, sample_uuid: str):
        """Test nested sections (3+ levels deep)."""
        # Create 4 levels deep
        level4 = Section(id=str(uuid.uuid4()), content="Level 4")
        level3 = Section(id=str(uuid.uuid4()), content="Level 3", sections=[level4])
        level2 = Section(id=str(uuid.uuid4()), content="Level 2", sections=[level3])
        level1 = Section(id=sample_uuid, content="Level 1", sections=[level2])

        # Verify all levels are accessible
        assert level1.content == "Level 1"
        assert len(level1.sections) == 1
        assert level1.sections[0].content == "Level 2"
        assert len(level1.sections[0].sections) == 1
        assert level1.sections[0].sections[0].content == "Level 3"
        assert len(level1.sections[0].sections[0].sections) == 1
        assert level1.sections[0].sections[0].sections[0].content == "Level 4"
        assert len(level1.sections[0].sections[0].sections[0].sections) == 0

    def test_auto_generate_uuid_when_id_not_provided(self):
        """Test auto-generate UUID when id not provided."""
        section1 = Section()
        section2 = Section()

        # Verify UUIDs are generated
        assert isinstance(section1.id, uuid.UUID)
        assert isinstance(section2.id, uuid.UUID)

        # Verify UUIDs are different
        assert section1.id != section2.id

        # Verify UUID is valid format (UUID4)
        assert section1.id.version == 4
        assert section2.id.version == 4

    def test_reject_invalid_data_types(self):
        """Test reject invalid data types."""
        # Test invalid id type
        with pytest.raises(ValidationError) as exc_info:
            Section(id=123)  # Should be UUID or string
        assert "id" in str(exc_info.value).lower()

        # Test invalid content type
        with pytest.raises(ValidationError) as exc_info:
            Section(id=str(uuid.uuid4()), content=123)  # Should be string
        assert "content" in str(exc_info.value).lower()

        # Test invalid marker type
        with pytest.raises(ValidationError) as exc_info:
            Section(id=str(uuid.uuid4()), marker=123)  # Should be string or None
        assert "marker" in str(exc_info.value).lower()

        # Test invalid sections type
        with pytest.raises(ValidationError) as exc_info:
            Section(id=str(uuid.uuid4()), sections="not a list")  # Should be list
        assert "sections" in str(exc_info.value).lower()

    def test_reject_missing_required_fields_with_clear_errors(self):
        """Test reject missing required fields with clear errors."""
        # Section doesn't have required fields in the strict sense (id auto-generates)
        # But we can test that invalid UUID strings are rejected
        with pytest.raises(ValidationError) as exc_info:
            Section(id="not-a-valid-uuid")
        errors = exc_info.value.errors()
        assert len(errors) > 0
        # Verify error message indicates the problem
        error_msg = str(exc_info.value).lower()
        assert "id" in error_msg or "uuid" in error_msg

    def test_handle_hebrew_content_correctly(self, hebrew_text: str):
        """Test handle Hebrew content correctly."""
        section = Section(
            id=str(uuid.uuid4()),
            content=hebrew_text,
            title="כותרת בעברית",
            marker="א",
        )

        # Verify Hebrew text is preserved correctly
        assert section.content == hebrew_text
        assert section.title == "כותרת בעברית"
        assert section.marker == "א"

        # Verify UTF-8 encoding
        assert section.content.encode("utf-8").decode("utf-8") == hebrew_text
        assert len(section.content) > 0  # Should have content

        # Test with mixed Hebrew and English
        mixed_content = f"{hebrew_text} - Basic Law"
        section_mixed = Section(id=str(uuid.uuid4()), content=mixed_content)
        assert section_mixed.content == mixed_content


class TestDocumentCreation:
    """Test Document model creation."""

    def test_create_document_with_all_fields(self, sample_uuid: str, hebrew_text: str):
        """Test creating Document with all fields including new metadata."""
        section = Section(id=sample_uuid, content=hebrew_text)
        doc = Document(
            title="חוק יסוד: כבוד האדם וחירותו",
            authors=["הכנסת", "משרד המשפטים"],
            version="1.0",
            source="https://example.com/law",
            published_date="1992-03-17",
            updated_date="2024-01-15T10:30:00Z",
            sections=[section],
        )

        assert doc.title == "חוק יסוד: כבוד האדם וחירותו"
        assert doc.authors == ["הכנסת", "משרד המשפטים"]
        assert doc.version == "1.0"
        assert doc.source == "https://example.com/law"
        assert doc.published_date == "1992-03-17"
        assert doc.updated_date == "2024-01-15T10:30:00Z"
        assert len(doc.sections) == 1
        assert doc.sections[0].id == uuid.UUID(sample_uuid)

    def test_create_document_with_minimal_fields(self, sample_uuid: str):
        """Test creating Document with minimal fields."""
        doc = Document(version="1.0")

        assert doc.version == "1.0"
        assert doc.title is None
        assert doc.authors is None
        assert doc.source is None
        assert doc.published_date is None
        assert doc.updated_date is None
        assert doc.sections == []

    def test_create_document_with_partial_metadata(self):
        """Test creating Document with some metadata fields."""
        doc = Document(
            title="Test Document",
            version="1.0",
            published_date="2024-01-15",
        )

        assert doc.title == "Test Document"
        assert doc.authors is None
        assert doc.version == "1.0"
        assert doc.published_date == "2024-01-15"
        assert doc.updated_date is None

    def test_create_document_with_hebrew_metadata(self, hebrew_text: str):
        """Test creating Document with Hebrew text in metadata."""
        doc = Document(
            title=hebrew_text,
            authors=["מחבר ראשון", "מחבר שני"],
            version="1.0",
        )

        assert doc.title == hebrew_text
        assert doc.authors == ["מחבר ראשון", "מחבר שני"]
        assert len(doc.authors) == 2

    def test_create_document_with_date_formats(self):
        """Test creating Document with different date formats."""
        # Date only format
        doc1 = Document(version="1.0", published_date="2024-01-15")
        assert doc1.published_date == "2024-01-15"

        # Date-time format
        doc2 = Document(version="1.0", updated_date="2024-01-15T10:30:00Z")
        assert doc2.updated_date == "2024-01-15T10:30:00Z"

        # Both dates
        doc3 = Document(
            version="1.0",
            published_date="2024-01-15",
            updated_date="2024-01-16T14:20:00Z",
        )
        assert doc3.published_date == "2024-01-15"
        assert doc3.updated_date == "2024-01-16T14:20:00Z"

    def test_create_document_with_empty_authors_list(self):
        """Test creating Document with empty authors list."""
        # Empty list should be allowed (though None is preferred)
        doc = Document(version="1.0", authors=[])
        assert doc.authors == []

    def test_document_rejects_missing_version(self):
        """Test Document rejects missing required version field."""
        with pytest.raises(ValidationError) as exc_info:
            Document()  # version is required
        errors = exc_info.value.errors()
        assert len(errors) > 0
        error_msg = str(exc_info.value).lower()
        assert "version" in error_msg

    def test_document_rejects_invalid_date_format(self):
        """Test Document rejects invalid date formats."""
        # Test invalid date format
        with pytest.raises(ValidationError) as exc_info:
            Document(version="1.0", published_date="not-a-date")
        errors = exc_info.value.errors()
        assert len(errors) > 0
        error_msg = str(exc_info.value).lower()
        assert "published_date" in error_msg or "iso 8601" in error_msg

        # Test invalid updated_date format
        with pytest.raises(ValidationError) as exc_info:
            Document(version="1.0", updated_date="2024/01/15")  # Wrong format
        errors = exc_info.value.errors()
        assert len(errors) > 0
        error_msg = str(exc_info.value).lower()
        assert "updated_date" in error_msg or "iso 8601" in error_msg

    def test_document_accepts_valid_date_formats(self):
        """Test Document accepts valid ISO 8601 date formats."""
        # Date only format
        doc1 = Document(version="1.0", published_date="2024-01-15")
        assert doc1.published_date == "2024-01-15"

        # Date-time format
        doc2 = Document(version="1.0", updated_date="2024-01-15T10:30:00")
        assert doc2.updated_date == "2024-01-15T10:30:00"

        # Date-time with timezone (Z)
        doc3 = Document(version="1.0", updated_date="2024-01-15T10:30:00Z")
        assert doc3.updated_date == "2024-01-15T10:30:00Z"


class TestIntegration:
    """Integration tests for YAML loading and round-trip conversion."""

    def test_load_yaml_file_into_pydantic_models(self, tmp_path, hebrew_text: str):
        """Integration test: Load YAML file into Pydantic models."""
        # Create a test YAML file with Hebrew content and metadata
        yaml_content = f"""
title: "חוק יסוד: כבוד האדם וחירותו"
authors:
  - "הכנסת"
version: "1.0"
source: "https://example.com/test"
published_date: "1992-03-17"
updated_date: "2024-01-15"
sections:
  - id: "123e4567-e89b-12d3-a456-426614174000"
    content: "{hebrew_text}"
    marker: "א"
    title: "סעיף ראשון"
    sections:
      - id: "223e4567-e89b-12d3-a456-426614174000"
        content: "תוכן משני"
"""

        yaml_file = tmp_path / "test_document.yaml"
        yaml_file.write_text(yaml_content, encoding="utf-8")

        # Load YAML
        with open(yaml_file, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # Convert to Pydantic models
        doc = Document(**data)

        # Verify structure is correct
        assert doc.title == "חוק יסוד: כבוד האדם וחירותו"
        assert doc.authors == ["הכנסת"]
        assert doc.version == "1.0"
        assert doc.source == "https://example.com/test"
        assert doc.published_date == "1992-03-17"
        assert doc.updated_date == "2024-01-15"
        assert len(doc.sections) == 1
        assert doc.sections[0].content == hebrew_text
        assert doc.sections[0].marker == "א"
        assert len(doc.sections[0].sections) == 1
        assert doc.sections[0].sections[0].content == "תוכן משני"

    def test_round_trip_pydantic_to_yaml_to_pydantic(self, hebrew_text: str):
        """Integration test: Round-trip Pydantic → YAML → Pydantic."""
        # Create Pydantic model with all metadata fields
        section1_id = str(uuid.uuid4())
        section2_id = str(uuid.uuid4())
        original_doc = Document(
            title="חוק יסוד: כבוד האדם וחירותו",
            authors=["הכנסת"],
            version="1.0",
            source="https://example.com/law",
            published_date="1992-03-17",
            updated_date="2024-01-15",
            sections=[
                Section(
                    id=section1_id,
                    content=hebrew_text,
                    marker="א",
                    title="סעיף ראשון",
                    sections=[
                        Section(
                            id=section2_id,
                            content="תוכן משני",
                        ),
                    ],
                ),
            ],
        )

        # Convert to dict (UUIDs will be serialized as strings in JSON mode)
        doc_dict = original_doc.model_dump(mode="json")

        # Convert to YAML
        yaml_str = yaml.dump(doc_dict, allow_unicode=True, default_flow_style=False)

        # Load YAML back
        loaded_data = yaml.safe_load(yaml_str)

        # Convert to Pydantic
        loaded_doc = Document(**loaded_data)

        # Verify equality (compare key fields)
        assert loaded_doc.title == original_doc.title
        assert loaded_doc.authors == original_doc.authors
        assert loaded_doc.version == original_doc.version
        assert loaded_doc.source == original_doc.source
        assert loaded_doc.published_date == original_doc.published_date
        assert loaded_doc.updated_date == original_doc.updated_date
        assert len(loaded_doc.sections) == len(original_doc.sections)
        assert loaded_doc.sections[0].id == original_doc.sections[0].id
        assert loaded_doc.sections[0].content == original_doc.sections[0].content
        assert loaded_doc.sections[0].marker == original_doc.sections[0].marker
        assert loaded_doc.sections[0].title == original_doc.sections[0].title
        assert len(loaded_doc.sections[0].sections) == len(original_doc.sections[0].sections)
        assert loaded_doc.sections[0].sections[0].id == original_doc.sections[0].sections[0].id
        assert (
            loaded_doc.sections[0].sections[0].content
            == original_doc.sections[0].sections[0].content
        )

    def test_round_trip_with_auto_generated_uuids(self):
        """Test round-trip preserves auto-generated UUIDs."""
        # Create document with auto-generated UUIDs
        original_doc = Document(
            version="1.0",
            sections=[
                Section(content="Section 1", sections=[Section(content="Section 1.1")]),
            ],
        )

        # Get the UUIDs
        section1_id = original_doc.sections[0].id
        section1_1_id = original_doc.sections[0].sections[0].id

        # Round-trip (UUIDs will be serialized as strings in JSON mode)
        doc_dict = original_doc.model_dump(mode="json")
        yaml_str = yaml.dump(doc_dict, allow_unicode=True)
        loaded_data = yaml.safe_load(yaml_str)
        loaded_doc = Document(**loaded_data)

        # Verify UUIDs are preserved
        assert loaded_doc.sections[0].id == section1_id
        assert loaded_doc.sections[0].sections[0].id == section1_1_id


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_content_string(self, sample_uuid: str):
        """Test section with empty content string."""
        section = Section(id=sample_uuid, content="")
        assert section.content == ""

    def test_very_long_hebrew_text(self, sample_uuid: str):
        """Test section with very long Hebrew text."""
        long_text = "חוק יסוד: כבוד האדם וחירותו " * 100
        section = Section(id=sample_uuid, content=long_text)
        assert len(section.content) > 1000
        assert section.content.startswith("חוק יסוד")

    def test_multiple_nested_sections(self, sample_uuid: str):
        """Test section with multiple nested sections."""
        section = Section(
            id=sample_uuid,
            content="Parent",
            sections=[
                Section(id=str(uuid.uuid4()), content="Child 1"),
                Section(id=str(uuid.uuid4()), content="Child 2"),
                Section(id=str(uuid.uuid4()), content="Child 3"),
            ],
        )
        assert len(section.sections) == 3
        assert section.sections[0].content == "Child 1"
        assert section.sections[1].content == "Child 2"
        assert section.sections[2].content == "Child 3"

    def test_uuid_string_vs_uuid_object(self, sample_uuid: str):
        """Test that UUID can be provided as string or UUID object."""
        uuid_obj = uuid.UUID(sample_uuid)

        section_from_string = Section(id=sample_uuid)
        section_from_uuid = Section(id=uuid_obj)

        assert section_from_string.id == section_from_uuid.id
        assert section_from_string.id == uuid_obj
