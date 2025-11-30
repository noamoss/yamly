"""Tests for diff router mode detection and routing."""

import pytest

from yaml_diffs.diff_router import DiffMode, detect_mode, diff_yaml_with_mode
from yaml_diffs.diff_types import DocumentDiff
from yaml_diffs.generic_diff_types import DiffOptions, GenericDiff, IdentityRule


class TestModeDetection:
    """Test automatic mode detection."""

    def test_detect_legal_document(self):
        """Test detection of legal document structure."""
        legal_doc = {
            "document": {
                "id": "test-001",
                "title": "Test Document",
                "type": "law",
                "language": "hebrew",
                "version": {"number": "1.0"},
                "source": {
                    "url": "https://example.com",
                    "fetched_at": "2025-01-01T00:00:00Z",
                },
                "sections": [
                    {"marker": "1", "content": "Section 1", "sections": []},
                ],
            }
        }

        mode = detect_mode(legal_doc)
        assert mode == DiffMode.LEGAL_DOCUMENT

    def test_detect_generic_yaml(self):
        """Test detection of generic YAML structure."""
        generic_yaml = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "data": {"key": "value"},
        }

        mode = detect_mode(generic_yaml)
        assert mode == DiffMode.GENERAL

    def test_detect_document_without_sections(self):
        """Test detection when document key exists but no sections."""
        partial_doc = {
            "document": {
                "title": "Test",
            }
        }

        mode = detect_mode(partial_doc)
        assert mode == DiffMode.GENERAL

    def test_detect_document_without_marker(self):
        """Test detection when sections exist but no markers."""
        doc_no_markers = {
            "document": {
                "sections": [
                    {"title": "Section 1", "content": "text"},
                ]
            }
        }

        mode = detect_mode(doc_no_markers)
        assert mode == DiffMode.GENERAL

    def test_detect_empty_dict(self):
        """Test detection with empty dictionary."""
        mode = detect_mode({})
        assert mode == DiffMode.GENERAL


class TestDiffRouting:
    """Test routing to correct diff engine."""

    def test_auto_mode_routes_to_legal_document(self):
        """Test auto mode routes legal documents correctly."""
        old_yaml = """
document:
  id: test-001
  title: Test Document
  type: law
  language: hebrew
  version:
    number: "1.0"
  source:
    url: https://example.com
    fetched_at: "2025-01-01T00:00:00Z"
  sections:
    - marker: "1"
      content: Old content
      sections: []
"""
        new_yaml = """
document:
  id: test-001
  title: Test Document
  type: law
  language: hebrew
  version:
    number: "1.0"
  source:
    url: https://example.com
    fetched_at: "2025-01-01T00:00:00Z"
  sections:
    - marker: "1"
      content: New content
      sections: []
"""

        result = diff_yaml_with_mode(old_yaml, new_yaml, mode=DiffMode.AUTO)

        assert isinstance(result, DocumentDiff)

    def test_auto_mode_routes_to_generic(self):
        """Test auto mode routes generic YAML correctly."""
        old_yaml = """
config:
  database:
    host: localhost
"""
        new_yaml = """
config:
  database:
    host: production.db
"""

        result = diff_yaml_with_mode(old_yaml, new_yaml, mode=DiffMode.AUTO)

        assert isinstance(result, GenericDiff)

    def test_force_general_mode(self):
        """Test forcing general mode even for legal documents."""
        # This is a valid legal document structure
        old_yaml = """
document:
  id: test-001
  title: Test
  type: law
  language: hebrew
  version:
    number: "1.0"
  source:
    url: https://example.com
    fetched_at: "2025-01-01T00:00:00Z"
  sections:
    - marker: "1"
      content: Content
      sections: []
"""
        new_yaml = old_yaml

        result = diff_yaml_with_mode(old_yaml, new_yaml, mode=DiffMode.GENERAL)

        # Should return GenericDiff even though it looks like a legal document
        assert isinstance(result, GenericDiff)

    def test_force_legal_document_mode(self):
        """Test forcing legal document mode."""
        old_yaml = """
document:
  id: test-001
  title: Test
  type: law
  language: hebrew
  version:
    number: "1.0"
  source:
    url: https://example.com
    fetched_at: "2025-01-01T00:00:00Z"
  sections:
    - marker: "1"
      content: Content
      sections: []
"""
        new_yaml = old_yaml

        result = diff_yaml_with_mode(old_yaml, new_yaml, mode=DiffMode.LEGAL_DOCUMENT)

        assert isinstance(result, DocumentDiff)

    def test_generic_mode_with_identity_rules(self):
        """Test generic mode uses identity rules."""
        old_yaml = """
containers:
  - name: web
    image: nginx:1.19
  - name: db
    image: postgres:13
"""
        new_yaml = """
containers:
  - name: web
    image: nginx:1.20
  - name: db
    image: postgres:13
"""

        options = DiffOptions(
            identity_rules=[IdentityRule(array="containers", identity_field="name")]
        )
        result = diff_yaml_with_mode(old_yaml, new_yaml, mode=DiffMode.GENERAL, options=options)

        assert isinstance(result, GenericDiff)
        # Should detect item changed (not add + remove)


class TestErrorHandling:
    """Test error handling in diff router."""

    def test_empty_yaml_raises_error(self):
        """Test that empty YAML raises an error."""
        with pytest.raises(ValueError, match="cannot be empty"):
            diff_yaml_with_mode("", "", mode=DiffMode.AUTO)

    def test_invalid_yaml_raises_error(self):
        """Test that invalid YAML raises an error."""
        import yaml

        with pytest.raises(yaml.YAMLError):
            diff_yaml_with_mode("invalid: yaml: content:", "valid: true", mode=DiffMode.AUTO)

