#!/bin/bash
# Start both backend and frontend dev servers
# Usage: ./scripts/dev.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🚀 Starting development environment...${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d .venv ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    if ! command -v uv &> /dev/null; then
        echo -e "${RED}❌ Error: uv is not installed${NC}"
        echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    uv venv
    source .venv/bin/activate
    uv sync --extra dev
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment found${NC}"
fi

# Activate virtual environment
source .venv/bin/activate

# Check if backend dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Backend dependencies not installed. Installing...${NC}"
    uv sync --extra dev
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
fi

# Check if frontend dependencies are installed
if [ ! -d ui/node_modules ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not installed. Installing...${NC}"
    cd ui
    npm install
    cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

# Create a PID file to track processes
PID_FILE="$PROJECT_ROOT/.dev-servers.pid"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"

    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    # Also try to kill by process name as fallback
    pkill -f "uvicorn.*api_server" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and exit signals
trap cleanup INT TERM EXIT

# Start backend in background
echo -e "${BLUE}📡 Starting backend API server on http://localhost:8000...${NC}"
uvicorn src.yaml_diffs.api_server.main:app --reload --port 8000 > /tmp/yaml-diffs-backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_FILE"

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${RED}❌ Backend server failed to start${NC}"
    echo "Check logs: cat /tmp/yaml-diffs-backend.log"
    exit 1
fi

echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"

# Start frontend
echo -e "${BLUE}🎨 Starting frontend dev server on http://localhost:3000...${NC}"
cd ui
npm run dev > /tmp/yaml-diffs-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"
cd ..

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    echo "Check logs: cat /tmp/yaml-diffs-frontend.log"
    exit 1
fi

echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Development environment is running!${NC}"
echo ""
echo -e "  ${BLUE}Backend API:${NC}  http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC}     http://localhost:8000/docs"
echo -e "  ${BLUE}Frontend UI:${NC}  http://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Tail logs in the foreground (optional - comment out if you don't want logs)
# You can uncomment these lines if you want to see logs in the terminal:
# tail -f /tmp/yaml-diffs-backend.log /tmp/yaml-diffs-frontend.log &

# Wait for both processes
wait
