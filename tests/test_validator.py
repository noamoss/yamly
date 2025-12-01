"""Tests for validation utilities."""

from io import StringIO
from pathlib import Path

import pytest

from yamly.exceptions import OpenSpecValidationError, PydanticValidationError
from yamly.models import Document
from yamly.validator import (
    validate_against_openspec,
    validate_against_pydantic,
    validate_document,
)


# Test fixtures
@pytest.fixture
def valid_document_data() -> dict:
    """Valid document data matching schema."""
    return {
        "document": {
            "id": "test-123",
            "title": "חוק בדיקה",
            "type": "law",
            "language": "hebrew",
            "version": {"number": "2024-01-01"},
            "source": {
                "url": "https://example.com/test",
                "fetched_at": "2025-01-20T09:50:00Z",
            },
            "sections": [],
        }
    }


@pytest.fixture
def valid_document_data_unwrapped() -> dict:
    """Valid document data without 'document' wrapper."""
    return {
        "id": "test-123",
        "title": "חוק בדיקה",
        "type": "law",
        "language": "hebrew",
        "version": {"number": "2024-01-01"},
        "source": {
            "url": "https://example.com/test",
            "fetched_at": "2025-01-20T09:50:00Z",
        },
        "sections": [],
    }


@pytest.fixture
def invalid_document_missing_required() -> dict:
    """Invalid document data missing required fields (only sections is required now)."""
    return {
        "document": {
            # Missing sections (only required field)
        }
    }


@pytest.fixture
def invalid_document_wrong_type() -> dict:
    """Invalid document data with wrong types."""
    return {
        "document": {
            "id": 123,  # Should be string
            "title": "Test",
            "type": "law",
            "language": "hebrew",
            "version": {"number": "2024-01-01"},
            "source": {
                "url": "https://example.com/test",
                "fetched_at": "2025-01-20T09:50:00Z",
            },
            "sections": [],
        }
    }


@pytest.fixture
def hebrew_document_data() -> dict:
    """Document data with Hebrew content."""
    return {
        "document": {
            "id": "hebrew-test",
            "title": "חוק יסוד: כבוד האדם וחירותו",
            "type": "law",
            "language": "hebrew",
            "version": {"number": "1992-03-17"},
            "source": {
                "url": "https://example.gov.il/law",
                "fetched_at": "2025-01-20T09:50:00Z",
            },
            "sections": [
                {
                    "id": "sec-1",
                    "marker": "א",
                    "title": "הגדרות",
                    "content": "בחוק זה—",
                    "sections": [],
                }
            ],
        }
    }


# Tests for validate_against_openspec
def test_validate_openspec_success(valid_document_data: dict) -> None:
    """Test validating valid document against OpenSpec schema."""
    # Should not raise
    validate_against_openspec(valid_document_data)


def test_validate_openspec_missing_required(invalid_document_missing_required: dict) -> None:
    """Test validating document with missing required fields raises OpenSpecValidationError."""
    with pytest.raises(OpenSpecValidationError) as exc_info:
        validate_against_openspec(invalid_document_missing_required)

    assert "validation failed" in str(exc_info.value).lower()
    assert len(exc_info.value.errors) > 0
    assert len(exc_info.value.field_paths) > 0


def test_validate_openspec_wrong_type(invalid_document_wrong_type: dict) -> None:
    """Test validating document with wrong types raises OpenSpecValidationError."""
    with pytest.raises(OpenSpecValidationError) as exc_info:
        validate_against_openspec(invalid_document_wrong_type)

    assert "validation failed" in str(exc_info.value).lower()
    assert len(exc_info.value.errors) > 0


def test_validate_openspec_error_messages(invalid_document_missing_required: dict) -> None:
    """Test that error messages are clear and include field paths."""
    with pytest.raises(OpenSpecValidationError) as exc_info:
        validate_against_openspec(invalid_document_missing_required)

    error_message = str(exc_info.value)
    # Should contain field paths
    assert " -> " in error_message or any("document" in path for path in exc_info.value.field_paths)
    # Should be formatted clearly
    assert "\n" in error_message or ":" in error_message


def test_validate_openspec_with_custom_schema(valid_document_data: dict) -> None:
    """Test validating with custom schema."""
    from yamly.schema import load_schema

    schema = load_schema()
    # Should not raise
    validate_against_openspec(valid_document_data, schema=schema)


def test_validate_openspec_hebrew_content(hebrew_document_data: dict) -> None:
    """Test validating document with Hebrew content."""
    # Should not raise
    validate_against_openspec(hebrew_document_data)


# Tests for validate_against_pydantic
def test_validate_pydantic_success(valid_document_data: dict) -> None:
    """Test validating valid document against Pydantic models."""
    doc = validate_against_pydantic(valid_document_data)

    assert isinstance(doc, Document)
    assert doc.id == "test-123"
    assert doc.title == "חוק בדיקה"


def test_validate_pydantic_unwrapped(valid_document_data_unwrapped: dict) -> None:
    """Test validating document data without 'document' wrapper."""
    doc = validate_against_pydantic(valid_document_data_unwrapped)

    assert isinstance(doc, Document)
    assert doc.id == "test-123"


def test_validate_pydantic_invalid(invalid_document_missing_required: dict) -> None:
    """Test validating invalid document (missing sections) raises OpenSpecValidationError."""
    # Now that metadata is optional, missing sections should fail OpenSpec validation
    # (Pydantic allows default, but schema requires it)
    with pytest.raises(OpenSpecValidationError) as exc_info:
        validate_against_openspec(invalid_document_missing_required)

    assert "validation" in str(exc_info.value).lower() or "error" in str(exc_info.value).lower()
    assert len(exc_info.value.errors) > 0


def test_validate_pydantic_wrong_type(invalid_document_wrong_type: dict) -> None:
    """Test validating document with wrong types raises PydanticValidationError."""
    with pytest.raises(PydanticValidationError) as exc_info:
        validate_against_pydantic(invalid_document_wrong_type)

    assert "validation failed" in str(exc_info.value).lower()
    assert len(exc_info.value.errors) > 0


def test_validate_pydantic_error_messages(invalid_document_missing_required: dict) -> None:
    """Test that error messages are clear and include field paths."""
    # Now that metadata is optional, missing sections should fail OpenSpec validation
    with pytest.raises(OpenSpecValidationError) as exc_info:
        validate_against_openspec(invalid_document_missing_required)

    error_message = str(exc_info.value)
    # Should contain field paths
    assert " -> " in error_message or "sections" in error_message.lower()
    # Should be formatted clearly
    assert "\n" in error_message or ":" in error_message


def test_validate_pydantic_hebrew_content(hebrew_document_data: dict) -> None:
    """Test validating document with Hebrew content."""
    doc = validate_against_pydantic(hebrew_document_data)

    assert isinstance(doc, Document)
    assert "חוק יסוד" in doc.title
    assert len(doc.sections) == 1
    assert doc.sections[0].title == "הגדרות"


# Tests for validate_document
def test_validate_document_full(valid_document_data: dict, tmp_path: Path) -> None:
    """Test full validation (OpenSpec + Pydantic) with file path."""
    import yaml

    yaml_file = tmp_path / "test.yaml"
    yaml_file.write_text(yaml.dump(valid_document_data), encoding="utf-8")

    doc = validate_document(yaml_file)

    assert isinstance(doc, Document)
    assert doc.id == "test-123"


def test_validate_document_from_string_path(valid_document_data: dict, tmp_path: Path) -> None:
    """Test full validation with string path."""
    import yaml

    yaml_file = tmp_path / "test.yaml"
    yaml_file.write_text(yaml.dump(valid_document_data), encoding="utf-8")

    doc = validate_document(str(yaml_file))

    assert isinstance(doc, Document)
    assert doc.id == "test-123"


def test_validate_document_from_file_like(valid_document_data: dict) -> None:
    """Test full validation with file-like object."""
    import yaml

    yaml_content = yaml.dump(valid_document_data)
    file_like = StringIO(yaml_content)

    doc = validate_document(file_like)

    assert isinstance(doc, Document)
    assert doc.id == "test-123"


def test_validate_document_invalid_openspec(
    invalid_document_missing_required: dict, tmp_path: Path
) -> None:
    """Test full validation fails on OpenSpec validation error."""
    import yaml

    yaml_file = tmp_path / "invalid.yaml"
    yaml_file.write_text(yaml.dump(invalid_document_missing_required), encoding="utf-8")

    with pytest.raises(OpenSpecValidationError):
        validate_document(yaml_file)


def test_validate_document_invalid_pydantic(
    invalid_document_wrong_type: dict, tmp_path: Path
) -> None:
    """Test full validation fails on Pydantic validation error."""
    import yaml

    # Note: This might pass OpenSpec if the schema is lenient, but fail Pydantic
    yaml_file = tmp_path / "invalid.yaml"
    yaml_file.write_text(yaml.dump(invalid_document_wrong_type), encoding="utf-8")

    # Could raise either OpenSpecValidationError or PydanticValidationError
    with pytest.raises((OpenSpecValidationError, PydanticValidationError)):
        validate_document(yaml_file)


def test_validate_document_hebrew(hebrew_document_data: dict, tmp_path: Path) -> None:
    """Test full validation with Hebrew content."""
    import yaml

    yaml_file = tmp_path / "hebrew.yaml"
    yaml_file.write_text(yaml.dump(hebrew_document_data), encoding="utf-8")

    doc = validate_document(yaml_file)

    assert isinstance(doc, Document)
    assert "חוק יסוד" in doc.title
    assert len(doc.sections) == 1


def test_validate_document_invalid_type() -> None:
    """Test validating document with invalid type raises ValueError."""
    with pytest.raises(ValueError) as exc_info:
        validate_document(123)  # type: ignore[arg-type]

    assert "must be str, Path, or TextIO" in str(exc_info.value)


# Tests for optional metadata fields
def test_validate_minimal_document_without_metadata() -> None:
    """Test validating minimal document with only sections (no metadata)."""
    minimal_data = {"document": {"sections": []}}
    doc = validate_against_pydantic(minimal_data)
    assert isinstance(doc, Document)
    assert doc.id is None
    assert doc.title is None
    assert doc.type is None
    assert doc.language is None
    assert doc.version is None
    assert doc.source is None
    assert doc.sections == []


def test_validate_openspec_minimal_document() -> None:
    """Test OpenSpec validation accepts minimal document without metadata."""
    minimal_data = {"document": {"sections": []}}
    # Should not raise
    validate_against_openspec(minimal_data)


def test_validate_document_without_id() -> None:
    """Test validating document without id field."""
    data = {
        "document": {
            "title": "Test Document",
            "type": "law",
            "language": "hebrew",
            "version": {"number": "1.0"},
            "source": {"url": "https://example.com", "fetched_at": "2025-01-20T09:50:00Z"},
            "sections": [],
        }
    }
    doc = validate_against_pydantic(data)
    assert doc.id is None
    assert doc.title == "Test Document"


def test_validate_document_without_version() -> None:
    """Test validating document without version object."""
    data = {
        "document": {
            "id": "test-123",
            "title": "Test",
            "sections": [],
        }
    }
    doc = validate_against_pydantic(data)
    assert doc.version is None
    assert doc.id == "test-123"


def test_validate_document_without_source() -> None:
    """Test validating document without source object."""
    data = {
        "document": {
            "id": "test-123",
            "sections": [],
        }
    }
    doc = validate_against_pydantic(data)
    assert doc.source is None


def test_validate_document_with_version_but_without_number() -> None:
    """Test validating document with version object but without number."""
    data = {
        "document": {
            "version": {},
            "sections": [],
        }
    }
    doc = validate_against_pydantic(data)
    assert doc.version is not None
    assert doc.version.number is None


def test_validate_document_with_source_but_without_url_or_fetched_at() -> None:
    """Test validating document with source object but without url or fetched_at."""
    data = {
        "document": {
            "source": {},
            "sections": [],
        }
    }
    doc = validate_against_pydantic(data)
    assert doc.source is not None
    assert doc.source.url is None
    assert doc.source.fetched_at is None


def test_validate_full_document_minimal(tmp_path: Path) -> None:
    """Test full validation pipeline with minimal document (no metadata)."""
    import yaml

    minimal_data = {"document": {"sections": [{"marker": "1", "content": "Test", "sections": []}]}}
    yaml_file = tmp_path / "minimal.yaml"
    yaml_file.write_text(yaml.dump(minimal_data), encoding="utf-8")

    doc = validate_document(yaml_file)
    assert isinstance(doc, Document)
    assert doc.id is None
    assert doc.title is None
    assert len(doc.sections) == 1
    assert doc.sections[0].marker == "1"
