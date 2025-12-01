"""Document diff endpoint.

Provides POST /api/v1/diff endpoint for comparing two YAML documents.
Supports both legal document mode (marker-based) and generic YAML mode.
"""

from fastapi import APIRouter, status

from yamly.api_server.schemas import (
    DiffRequest,
    UnifiedDiffResponse,
)
from yamly.diff import enrich_diff_with_yaml_extraction
from yamly.diff_router import DiffMode, diff_yaml_with_mode
from yamly.diff_types import DocumentDiff
from yamly.generic_diff import enrich_generic_diff_with_line_numbers
from yamly.generic_diff_types import DiffOptions, GenericDiff, IdentityRule

router = APIRouter()


@router.post(
    "/api/v1/diff",
    response_model=UnifiedDiffResponse,
    status_code=status.HTTP_200_OK,
    tags=["diff"],
    summary="Diff two YAML documents",
    description="Compares two YAML documents and returns detected changes. "
    "Supports both legal document mode (marker-based) and generic YAML mode.",
)
def diff_documents_endpoint(request: DiffRequest) -> UnifiedDiffResponse:
    """Diff two YAML documents.

    Accepts two YAML documents (old and new versions) and compares them
    to detect changes. Supports both legal document mode (marker-based diff)
    and generic YAML mode (path-based diff with identity rules).

    Args:
        request: DiffRequest containing old and new YAML content, mode, and optional identity rules.

    Returns:
        UnifiedDiffResponse with either DocumentDiff (legal_document mode) or
        GenericDiff (general mode) containing all detected changes.

    Raises:
        HTTPException: If document loading or diffing fails
            (handled by exception handlers in main.py).

    Examples:
        >>> POST /api/v1/diff
        {
            "old_yaml": "document:\\n  id: 'test'\\n  ...",
            "new_yaml": "document:\\n  id: 'test'\\n  ...",
            "mode": "auto"
        }
        {
            "mode": "legal_document",
            "document_diff": {...},
            "generic_diff": null
        }
    """
    # Convert identity rules from request to DiffOptions
    identity_rules = [
        IdentityRule(
            array=rule.array,
            identity_field=rule.identity_field,
            when_field=rule.when_field,
            when_value=rule.when_value,
        )
        for rule in request.identity_rules
    ]
    options = DiffOptions(identity_rules=identity_rules)

    # Diff using the router (handles mode detection and routing)
    result = diff_yaml_with_mode(
        request.old_yaml,
        request.new_yaml,
        mode=request.mode,
        options=options,
    )

    # Determine which mode was actually used
    if isinstance(result, DocumentDiff):
        # Legal document mode
        # Enrich with YAML extraction and line numbers
        enrich_diff_with_yaml_extraction(result, request.old_yaml, request.new_yaml)
        return UnifiedDiffResponse(
            mode=DiffMode.LEGAL_DOCUMENT,
            document_diff=result,
            generic_diff=None,
        )
    elif isinstance(result, GenericDiff):
        # Generic mode
        # Enrich with line numbers
        enrich_generic_diff_with_line_numbers(result, request.old_yaml, request.new_yaml)
        return UnifiedDiffResponse(
            mode=DiffMode.GENERAL,
            document_diff=None,
            generic_diff=result,
        )
    else:
        # Should not happen, but handle gracefully
        raise ValueError(f"Unexpected diff result type: {type(result)}")
