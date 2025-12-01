"""Main CLI entry point for yamly.

This module provides the main command-line interface using Click.
"""

from __future__ import annotations

import click

from yamly import __version__
from yamly.cli import commands
from yamly.cli.utils import handle_cli_error


@click.group()
@click.version_option(version=__version__, prog_name="yamly")
@click.pass_context
def cli(ctx: click.Context) -> None:
    """yamly: Command-line tool for validating and diffing YAML documents.

    This tool provides commands for:
    - Validating YAML documents against the legal document schema
    - Diffing two versions of YAML documents to detect changes

    For more information, see: https://github.com/noamoss/yamly
    """
    # Ensure context object exists
    ctx.ensure_object(dict)


# Register commands
cli.add_command(commands.validate_command)
cli.add_command(commands.diff_command)
cli.add_command(commands.mcp_server_command)


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
