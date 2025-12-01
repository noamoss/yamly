"""Schema endpoint.

Provides GET /api/v1/schema endpoint for retrieving the OpenSpec schema.
"""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()


@router.get(
    "/api/v1/schema",
    response_class=Response,
    tags=["schema"],
    summary="Get OpenSpec schema",
    description="Returns the OpenSpec schema definition for legal documents in YAML format.",
)
def get_schema() -> Response:
    """Get the OpenSpec schema definition.

    Returns:
        Response with YAML content of the schema file.
    """
    # Get the schema file path relative to this file
    schema_path = Path(__file__).parent.parent.parent / "schema" / "legal_document_spec.yaml"

    if not schema_path.exists():
        return Response(
            content="Schema file not found",
            status_code=404,
            media_type="text/plain",
        )

    schema_content = schema_path.read_text(encoding="utf-8")

    return Response(
        content=schema_content,
        media_type="application/x-yaml",
        headers={"Content-Disposition": 'inline; filename="legal_document_spec.yaml"'},
    )
