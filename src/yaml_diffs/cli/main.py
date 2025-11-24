"""Main CLI entry point for yaml-diffs.

This module provides the main command-line interface using Click.
"""

from __future__ import annotations

import sys

import click

from yaml_diffs import __version__
from yaml_diffs.cli import commands
from yaml_diffs.exceptions import (
    OpenSpecValidationError,
    PydanticValidationError,
    ValidationError,
    YAMLLoadError,
)


@click.group()
@click.version_option(version=__version__, prog_name="yaml-diffs")
@click.pass_context
def cli(ctx: click.Context) -> None:
    """yaml-diffs: Command-line tool for validating and diffing YAML documents.

    This tool provides commands for:
    - Validating YAML documents against the legal document schema
    - Diffing two versions of YAML documents to detect changes

    For more information, see: https://github.com/noamoss/yaml_diffs
    """
    # Ensure context object exists
    ctx.ensure_object(dict)


def handle_cli_error(error: Exception, file_path: str | None = None) -> None:
    """Handle CLI errors with user-friendly messages.

    Args:
        error: The exception that occurred.
        file_path: Optional file path that caused the error.
    """
    file_info = f" ({file_path})" if file_path else ""

    if isinstance(error, YAMLLoadError):
        click.echo(f"Error: Failed to load YAML file{file_info}", err=True)
        if error.message:
            click.echo(f"  {error.message}", err=True)
        if error.original_error:
            click.echo(f"  Details: {error.original_error}", err=True)
        sys.exit(1)

    elif isinstance(error, OpenSpecValidationError):
        click.echo(f"Error: Document validation failed{file_info}", err=True)
        if error.message:
            click.echo(f"  {error.message}", err=True)
        if error.errors:
            click.echo("  Validation errors:", err=True)
            for err in error.errors[:5]:  # Show first 5 errors
                click.echo(f"    - {err}", err=True)
            if len(error.errors) > 5:
                click.echo(f"    ... and {len(error.errors) - 5} more errors", err=True)
        sys.exit(1)

    elif isinstance(error, PydanticValidationError):
        click.echo(f"Error: Document structure validation failed{file_info}", err=True)
        if error.message:
            click.echo(f"  {error.message}", err=True)
        if error.errors:
            click.echo("  Validation errors:", err=True)
            for err in error.errors[:5]:  # Show first 5 errors
                click.echo(f"    - {err}", err=True)
            if len(error.errors) > 5:
                click.echo(f"    ... and {len(error.errors) - 5} more errors", err=True)
        sys.exit(1)

    elif isinstance(error, ValidationError):
        click.echo(f"Error: Validation failed{file_info}", err=True)
        if error.message:
            click.echo(f"  {error.message}", err=True)
        sys.exit(1)

    elif isinstance(error, FileNotFoundError):
        click.echo(f"Error: File not found{file_info}", err=True)
        click.echo(f"  {error}", err=True)
        sys.exit(1)

    elif isinstance(error, ValueError):
        click.echo(f"Error: Invalid value{file_info}", err=True)
        click.echo(f"  {error}", err=True)
        sys.exit(1)

    else:
        click.echo(f"Error: Unexpected error occurred{file_info}", err=True)
        click.echo(f"  {type(error).__name__}: {error}", err=True)
        sys.exit(1)


# Register commands
cli.add_command(commands.validate_command)
cli.add_command(commands.diff_command)


def main() -> None:
    """Main entry point for the CLI.

    This function is called by the console_scripts entry point.
    It wraps the CLI in error handling to provide consistent error messages.
    """
    try:
        cli()
    except Exception as e:
        handle_cli_error(e)


if __name__ == "__main__":
    main()
