#!/usr/bin/env bash
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

PG_SERVICE="postgresql@14"
DB_NAME="accommodation"

log()  { echo -e "${CYAN}[accom]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }
step() { echo -e "\n${BOLD}${BLUE}▶ $*${NC}"; }

# ── cleanup on exit ───────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  log "Shutting down..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  ok "All services stopped"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─────────────────────────────────────────────────────────────────────────────
step "Node.js version"

# Load nvm if available so we can switch Node versions
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi

REQUIRED_NODE="20"
CURRENT_NODE_MAJOR="$(node --version 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)"

if (( CURRENT_NODE_MAJOR < REQUIRED_NODE )); then
  if command -v nvm &>/dev/null; then
    log "Node $(node --version) is too old (need >=20). Installing Node ${REQUIRED_NODE} via nvm..."
    nvm install "$REQUIRED_NODE" --no-progress 2>&1 | tail -3
    nvm use "$REQUIRED_NODE"
    ok "Switched to Node $(node --version)"
  else
    err "Node $(node --version) is too old. Next.js requires Node >=20."
    err "Install Node 20 via: nvm install 20  OR  brew install node@20"
    exit 1
  fi
else
  ok "Node $(node --version)"
fi

ok "npm $(npm --version)"

# ─────────────────────────────────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v psql &>/dev/null; then
  err "psql not found. Run: brew install postgresql@14"; exit 1
fi
ok "PostgreSQL $(psql --version | awk '{print $3}')"

# ─────────────────────────────────────────────────────────────────────────────
step "Starting PostgreSQL"

PG_RUNNING=false
if pg_isready -q 2>/dev/null; then
  ok "PostgreSQL is already running"
  PG_RUNNING=true
else
  log "Starting $PG_SERVICE via Homebrew..."
  brew services start "$PG_SERVICE" &>/dev/null || true
  for i in {1..10}; do
    if pg_isready -q 2>/dev/null; then
      ok "PostgreSQL started"
      PG_RUNNING=true
      break
    fi
    sleep 1
  done
fi

if [[ "$PG_RUNNING" == false ]]; then
  err "Could not start PostgreSQL. Start it manually and re-run this script."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
step "Setting up database"

CURRENT_USER="$(whoami)"

# Ensure a 'postgres' superuser role exists (Homebrew uses the OS username by default)
psql -U "$CURRENT_USER" -d postgres -c \
  "DO \$\$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
       CREATE ROLE postgres SUPERUSER LOGIN PASSWORD 'postgres';
     END IF;
   END \$\$;" 2>/dev/null || true

if psql -U "$CURRENT_USER" -lqt 2>/dev/null | cut -d '|' -f1 | grep -qw "$DB_NAME"; then
  ok "Database '$DB_NAME' already exists"
else
  log "Creating database '$DB_NAME'..."
  createdb -U "$CURRENT_USER" "$DB_NAME" 2>/dev/null || \
    psql -U "$CURRENT_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
  ok "Database '$DB_NAME' created"
fi

# DB env — use the OS user (Homebrew trust auth, no password needed)
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USER="$CURRENT_USER"
export DB_PASSWORD=""
export DB_NAME="$DB_NAME"
export PORT="3001"
export CORS_ORIGIN="http://localhost:3000"
export NODE_ENV="development"

# Load extra vars from backend/.env (SENTRY_DSN, CLERK_SECRET_KEY, CLERK_JWT_KEY, etc.)
# Sourced (not read line-by-line) so quoted multi-line values — e.g. a PEM key — parse
# correctly. Local-dev DB_*/PORT/CORS_ORIGIN/NODE_ENV set above always win, and
# DATABASE_URL is never pulled in locally (use the individual DB_* vars instead).
if [[ -f "$BACKEND_DIR/.env" ]]; then
  _saved_db_host=$DB_HOST _saved_db_port=$DB_PORT _saved_db_user=$DB_USER
  _saved_db_password=$DB_PASSWORD _saved_db_name=$DB_NAME _saved_port=$PORT
  _saved_cors=$CORS_ORIGIN _saved_node_env=$NODE_ENV
  set -a
  # shellcheck source=/dev/null
  source "$BACKEND_DIR/.env"
  set +a
  export DB_HOST=$_saved_db_host DB_PORT=$_saved_db_port DB_USER=$_saved_db_user \
         DB_PASSWORD=$_saved_db_password DB_NAME=$_saved_db_name PORT=$_saved_port \
         CORS_ORIGIN=$_saved_cors NODE_ENV=$_saved_node_env
  unset DATABASE_URL
fi

# ─────────────────────────────────────────────────────────────────────────────
step "Installing dependencies"

cd "$BACKEND_DIR"
if [[ ! -d node_modules ]]; then
  log "Installing backend dependencies..."
  npm install
fi
ok "Backend dependencies ready"

cd "$FRONTEND_DIR"
if [[ ! -d node_modules ]]; then
  log "Installing frontend dependencies..."
  npm install
fi
# Verify next binary exists (can be missing after a Node version switch)
if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/next" ]]; then
  log "Reinstalling frontend dependencies for new Node version..."
  npm install
fi
ok "Frontend dependencies ready"

# ─────────────────────────────────────────────────────────────────────────────
step "Starting services"

# ── Backend ──
# nest start compiles TypeScript and starts the server.
# NODE_OPTIONS flag exposes globalThis.crypto needed by @nestjs/typeorm on Node 18.
# (On Node 20+ crypto is already global so the flag is harmless.)
log "Starting NestJS backend on http://localhost:${PORT} ..."
(
  cd "$BACKEND_DIR"
  # All required vars are already exported; NODE_OPTIONS added for Node 18 compat
  NODE_OPTIONS="--experimental-global-webcrypto" \
    node_modules/.bin/nest start \
    2>&1 | while IFS= read -r line; do echo -e "${BLUE}[backend]${NC} $line"; done
) &
BACKEND_PID=$!

# Wait for backend to be ready (up to 30 s)
log "Waiting for backend to be ready..."
BACKEND_READY=false
for i in {1..30}; do
  if curl -sf "http://localhost:${PORT}/api/health/live" &>/dev/null; then
    ok "Backend is ready"
    BACKEND_READY=true
    break
  fi
  sleep 1
done

if [[ "$BACKEND_READY" == false ]]; then
  err "Backend did not start in time. Check the [backend] output above."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

# ── Frontend ──
# Unset PORT so Next.js doesn't inherit the backend's port (3001).
log "Starting Next.js frontend on http://localhost:3000 ..."
(
  cd "$FRONTEND_DIR"
  unset PORT
  node_modules/.bin/next dev --port 3000 \
    2>&1 | while IFS= read -r line; do echo -e "${GREEN}[frontend]${NC} $line"; done
) &
FRONTEND_PID=$!

# Wait for frontend to be ready (up to 60 s — Next.js cold compile takes longer)
log "Waiting for frontend to be ready..."
FRONTEND_READY=false
for i in {1..60}; do
  if curl -sf "http://localhost:3000" &>/dev/null; then
    ok "Frontend is ready"
    FRONTEND_READY=true
    break
  fi
  sleep 1
done

if [[ "$FRONTEND_READY" == false ]]; then
  warn "Frontend did not respond in time — it may still be compiling. Check the [frontend] output."
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✔ Accommodation Manager is running${NC}"
echo -e "  ${CYAN}Frontend  →${NC}  http://localhost:3000/dashboard"
echo -e "  ${CYAN}Backend   →${NC}  http://localhost:${PORT}/api"
echo ""
echo -e "${YELLOW}  Upload your XLSX file from the dashboard to seed the database.${NC}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services.${NC}"
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
