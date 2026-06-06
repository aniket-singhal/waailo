#!/usr/bin/env bash
#
# Waailo HR — local PostgreSQL setup (no Docker).
# Installs/starts PostgreSQL via Homebrew if needed, creates the waailo role +
# database, then runs the Prisma migration and seed.
#
# Usage:  bash setup-db.sh
#
set -uo pipefail

DB_NAME="waailo"
DB_USER="waailo"
DB_PASS="waailo"
PG_PORT="5432"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
die()  { printf "\033[31m✗ %s\033[0m\n" "$1"; exit 1; }

# --- Make Homebrew Postgres binaries discoverable ---
for p in \
  /opt/homebrew/opt/postgresql@16/bin \
  /opt/homebrew/opt/postgresql@15/bin \
  /opt/homebrew/opt/postgresql@14/bin \
  /usr/local/opt/postgresql@16/bin \
  /usr/local/opt/postgresql@15/bin \
  /opt/homebrew/bin /usr/local/bin; do
  [ -d "$p" ] && PATH="$p:$PATH"
done
export PATH

bold "1) Checking for PostgreSQL"
if ! command -v psql >/dev/null 2>&1; then
  warn "psql not found — attempting to install via Homebrew"
  command -v brew >/dev/null 2>&1 || die "Homebrew not installed. Install it from https://brew.sh then re-run, or install PostgreSQL manually."
  brew install postgresql@16 || die "brew install postgresql@16 failed"
  PATH="$(brew --prefix)/opt/postgresql@16/bin:$PATH"; export PATH
fi
ok "psql: $(psql --version)"

bold "2) Starting the PostgreSQL service"
if command -v brew >/dev/null 2>&1; then
  PG_FORMULA="$(brew list --formula 2>/dev/null | grep -m1 '^postgresql@' || true)"
  if [ -n "${PG_FORMULA:-}" ]; then
    brew services start "$PG_FORMULA" >/dev/null 2>&1 || true
    ok "Started $PG_FORMULA (brew services)"
  else
    warn "No brew-managed postgresql@ formula detected; assuming Postgres is already running (e.g. Postgres.app)"
  fi
fi

bold "3) Waiting for PostgreSQL to accept connections on :$PG_PORT"
for i in $(seq 1 30); do
  if pg_isready -h localhost -p "$PG_PORT" >/dev/null 2>&1; then break; fi
  sleep 1
  [ "$i" -eq 30 ] && die "PostgreSQL did not become ready on localhost:$PG_PORT. Is it installed and running?"
done
ok "PostgreSQL is accepting connections"

# --- Find a working superuser psql connection (socket, current user) ---
bold "4) Creating role + database"
ADMIN=""
for try in "psql -d postgres" "psql -U postgres -d postgres" "psql -h localhost -U postgres -d postgres"; do
  if $try -tAc "SELECT 1" >/dev/null 2>&1; then ADMIN="$try"; break; fi
done
[ -n "$ADMIN" ] || die "Could not connect to PostgreSQL as a superuser. Try: createuser -s \$(whoami)  then re-run."

# Role
if $ADMIN -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  ok "Role '$DB_USER' already exists"
else
  $ADMIN -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS' CREATEDB;" >/dev/null \
    && ok "Created role '$DB_USER'" || die "Failed to create role"
fi

# Database
if $ADMIN -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  ok "Database '$DB_NAME' already exists"
else
  $ADMIN -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >/dev/null \
    && ok "Created database '$DB_NAME'" || die "Failed to create database"
fi

bold "5) Backend: env, dependencies, migration, seed"
cd "$BACKEND_DIR" || die "backend/ not found at $BACKEND_DIR"

if [ ! -f .env ]; then
  cp .env.example .env && ok "Created backend/.env from example"
else
  ok "backend/.env already present"
fi

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/prisma ]; then
  warn "Installing backend dependencies (this can take a minute)…"
  npm install || die "npm install failed"
fi
ok "Dependencies ready"

echo "Running Prisma migration…"
npx prisma migrate dev --name init || die "prisma migrate failed"
ok "Migration applied"

echo "Seeding reference data + demo company…"
npm run seed || warn "Seed failed (you can re-run 'npm run seed' later)"

bold "Done 🎉"
echo "Start the API with:   cd backend && npm run start:dev"
echo "Demo login → slug: demo-co   email: owner@demo.co   password: Password123!"
