#!/usr/bin/env bash

# ==============================================================================
# Notes Web App - Runner Script
# Default: Runs in PRODUCTION mode
# Flag --dev: Runs in DEVELOPMENT mode with hot reload / HMR
# ==============================================================================

set -e

BACKEND_PORT=9548
FRONTEND_PORT=9547
MODE="production"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dev|-d)
      MODE="development"
      shift
      ;;
    --prod|-p)
      MODE="production"
      shift
      ;;
    --help|-h)
      echo "Usage: ./run.sh [options]"
      echo "Options:"
      echo "  --dev, -d    Run in development mode (hot reloading & separate Vite dev server)"
      echo "  --prod, -p   Run in production mode (compiled assets, single Fastify server) [default]"
      echo "  --help, -h   Show this help message"
      exit 0
      ;;
  esac
done

# Text styling
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ==============================================================="
echo "                     NOTES WEB APP RUNNER                        "
echo "         Fastify TS + React Vite + MySQL + S3 Storage            "
echo "  ==============================================================="
echo -e "${RESET}"

echo -e "[*] Mode: ${MAGENTA}${BOLD}${MODE}${RESET}"

# Function to kill existing processes on target ports
free_port() {
  local port=$1
  local name=$2
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}[!] Port $port is currently in use ($name). Freeing port (killing PID: $pids)...${RESET}"
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
  fi
}

echo -e "${CYAN}[*] Checking and freeing ports ($BACKEND_PORT, $FRONTEND_PORT)...${RESET}"
free_port $BACKEND_PORT "Backend Fastify"
if [ "$MODE" = "development" ]; then
  free_port $FRONTEND_PORT "Frontend Vite"
fi

# Cleanup handler on exit or Ctrl+C
cleanup() {
  echo ""
  echo -e "${YELLOW}[-] Shutting down Notes Web App services...${RESET}"
  
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "    Stopping Backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "    Stopping Frontend (PID $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  # Final port check to ensure clean exit
  local remaining_pids=$(lsof -ti :$BACKEND_PORT,:$FRONTEND_PORT 2>/dev/null || true)
  if [ -n "$remaining_pids" ]; then
    kill -9 $remaining_pids 2>/dev/null || true
  fi

  echo -e "${GREEN}[+] All services stopped cleanly. Ports freed.${RESET}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check root node_modules
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[*] Installing workspace dependencies...${RESET}"
  npm install
fi

# Check backend .env
if [ ! -f "backend/.env" ]; then
  if [ -f ".env" ]; then
    cp .env backend/.env
  elif [ -f "backend/.env.example" ]; then
    echo -e "${YELLOW}[!] backend/.env not found. Creating from .env.example...${RESET}"
    cp backend/.env.example backend/.env
  fi
fi

if [ "$MODE" = "development" ]; then
  # DEVELOPMENT MODE
  echo ""
  echo -e "${GREEN}[+] Starting Backend in Development Mode (Port $BACKEND_PORT)...${RESET}"
  (cd backend && npm run dev) &
  BACKEND_PID=$!

  sleep 1

  echo -e "${GREEN}[+] Starting Frontend Vite Dev Server (Port $FRONTEND_PORT)...${RESET}"
  (cd frontend && npm run dev) &
  FRONTEND_PID=$!

  echo ""
  echo -e "${BOLD}${GREEN}===============================================================${RESET}"
  echo -e "${BOLD} Notes Web App is running in DEVELOPMENT mode!${RESET}"
  echo -e "  Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT}${RESET}"
  echo -e "  Backend:   ${CYAN}http://localhost:${BACKEND_PORT}${RESET}"
  echo -e "  API Docs:  ${CYAN}http://localhost:${BACKEND_PORT}/docs${RESET}"
  echo -e "${BOLD}${GREEN}===============================================================${RESET}"
  echo -e "${YELLOW}Press [Ctrl + C] anytime to stop servers and free ports.${RESET}"
  echo ""

  wait $BACKEND_PID $FRONTEND_PID

else
  # PRODUCTION MODE
  echo -e "${CYAN}[*] Checking and building production bundles...${RESET}"
  
  if [ ! -d "frontend/dist" ]; then
    echo -e "    Building Frontend SPA..."
    (cd frontend && npm run build)
  fi

  if [ ! -d "backend/dist" ]; then
    echo -e "    Building Backend TypeScript..."
    (cd backend && npm run build)
  fi

  echo ""
  echo -e "${GREEN}[+] Starting Fastify Server in Production Mode (Port $BACKEND_PORT)...${RESET}"
  (cd backend && NODE_ENV=production node dist/server.js) &
  BACKEND_PID=$!

  echo ""
  echo -e "${BOLD}${GREEN}===============================================================${RESET}"
  echo -e "${BOLD} Notes Web App is running in PRODUCTION mode!${RESET}"
  echo -e "  Web App:   ${CYAN}http://localhost:${BACKEND_PORT}${RESET}"
  echo -e "  API Base:  ${CYAN}http://localhost:${BACKEND_PORT}/api${RESET}"
  echo -e "  API Docs:  ${CYAN}http://localhost:${BACKEND_PORT}/docs${RESET}"
  echo -e "${BOLD}${GREEN}===============================================================${RESET}"
  echo -e "${YELLOW}Tip: Run './run.sh --dev' for live reloading and development mode.${RESET}"
  echo -e "${YELLOW}Press [Ctrl + C] anytime to stop the server and free ports.${RESET}"
  echo ""

  wait $BACKEND_PID
fi
