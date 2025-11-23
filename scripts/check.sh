#!/bin/bash
# Local CI check script - runs all checks that CI runs
# Usage: ./scripts/check.sh

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

echo "🔍 Running local CI checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    local temp_file=$(mktemp)

    echo -n "Running $name... "
    if eval "$command" > "$temp_file" 2>&1; then
        echo -e "${GREEN}✓${NC}"
        rm -f "$temp_file"
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}Error: $name failed${NC}"
        echo "Command: $command"
        echo "Output:"
        cat "$temp_file"
        rm -f "$temp_file"
        return 1
    fi
}

# Check if we're in a virtual environment or use uv
if [ -d .venv ]; then
    PYTHON_CMD=".venv/bin/python"
    PIP_CMD=".venv/bin/pip"
    RUFF_CMD=".venv/bin/ruff"
    MYPY_CMD=".venv/bin/mypy"
    PYTEST_CMD=".venv/bin/pytest"
elif command -v uv &> /dev/null; then
    PYTHON_CMD="uv run python"
    PIP_CMD="uv run pip"
    RUFF_CMD="uv run ruff"
    MYPY_CMD="uv run mypy"
    PYTEST_CMD="uv run pytest"
else
    echo -e "${RED}Error: No virtual environment found and uv is not available${NC}"
    echo "Please run: uv venv && source .venv/bin/activate"
    exit 1
fi

# Install dependencies if needed
echo "Installing dependencies..."
$PIP_CMD install -e ".[dev]" > /dev/null 2>&1 || {
    echo -e "${YELLOW}Warning: Could not install dependencies automatically${NC}"
    echo "Please run: pip install -e '.[dev]'"
}

echo ""
echo "Running checks..."
echo ""

# Run ruff check (linting)
run_check "ruff check" "$RUFF_CMD check src/ tests/"

# Run ruff format check
run_check "ruff format check" "$RUFF_CMD format --check src/ tests/"

# Run mypy type checking
run_check "mypy type check" "$MYPY_CMD src/"

# Run tests
run_check "pytest" "$PYTEST_CMD"

echo ""
echo -e "${GREEN}✓ All checks passed!${NC}"
echo "You're ready to commit and push."
