#!/bin/bash
# Stop all development servers
# Usage: ./scripts/dev-stop.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/.dev-servers.pid"

echo -e "${YELLOW}🛑 Stopping development servers...${NC}"

# Stop processes from PID file
if [ -f "$PID_FILE" ]; then
    stopped=0
    while read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null && stopped=$((stopped + 1)) || true
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"

    if [ $stopped -gt 0 ]; then
        echo -e "${GREEN}✓ Stopped $stopped server(s) from PID file${NC}"
    fi
fi

# Also try to kill by process name as fallback
backend_killed=$(pkill -f "uvicorn.*api_server" 2>/dev/null && echo "yes" || echo "no")
frontend_killed=$(pkill -f "next dev" 2>/dev/null && echo "yes" || echo "no")

# Wait a moment for processes to terminate
sleep 1

# Force kill if still running
pkill -9 -f "uvicorn.*api_server" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true

# Check if anything is still running
if pgrep -f "uvicorn.*api_server" > /dev/null || pgrep -f "next dev" > /dev/null; then
    echo -e "${RED}⚠️  Some servers may still be running${NC}"
    echo "You may need to manually stop them:"
    echo "  pkill -f 'uvicorn.*api_server'"
    echo "  pkill -f 'next dev'"
else
    echo -e "${GREEN}✓ All development servers stopped${NC}"
fi
