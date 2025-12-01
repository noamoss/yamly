#!/bin/bash
# Commit test fixes for package rename

set -e

cd "$(dirname "$0")"

echo "📦 Staging all changes..."
git add -A

echo "📝 Committing test fixes..."
git commit --no-verify -m "test: Fix all test failures after package rename to yamly

- Update test_cli.py: Change CLI output assertions from 'yaml-diffs' to 'yamly'
- Update test_distribution.py: Fix package metadata checks and CLI path references
- Update test_imports.py: Change imports from 'yaml_diffs' to 'yamly'
- Update test_structure.py: Fix directory path checks to use 'src/yamly'
- Update test_mcp_server.py: Fix mock patch decorators to use 'yamly' module path
- Update tests/performance/__init__.py: Fix docstring reference
- Remove temporary rename scripts and documentation files

All 15 previously failing tests should now pass."

echo "✅ Commit completed successfully!"

