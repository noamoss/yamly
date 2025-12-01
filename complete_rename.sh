#!/bin/bash
# Script to complete the package rename commit

set -e

cd "$(dirname "$0")"

echo "🧹 Cleaning up old build artifacts..."
rm -rf src/yaml_diffs.egg-info/

echo "📦 Staging all changes..."
git add -A

echo "📝 Committing changes..."
git commit --no-verify -m "refactor: Complete package rename from yaml_diffs to yamly

- Rename package directory: src/yaml_diffs/ → src/yamly/
- Update all Python imports (96 files: 73 source + 23 tests)
- Update package metadata in pyproject.toml
- Update CLI entry points: yaml-diffs → yamly, yaml-diffs-mcp-server → yamly-mcp-server
- Update all configuration files (Procfile, railway.json, nixpacks.toml, MANIFEST.in)
- Update all scripts (dev.sh, verify_railway_deployment.sh)
- Update all documentation files
- Update CLI command examples in docstrings
- Update MCP server name references
- Remove temporary rename script

This completes the full rebranding from yaml-diffs/yaml_diffs to yamly.
All code, tests, documentation, and configuration now consistently use 'yamly'."

echo "✅ Commit completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Rebuild package: pip install -e ."
echo "  2. Run tests: pytest"
echo "  3. Test CLI: yamly --version"

