#!/usr/bin/env bash
# =============================================================================
# Smart Bus System — Database Seeding Script for Render PostgreSQL
#
# Usage:
#   1. Deploy the web service via Render Blueprint (tables auto-create on start)
#   2. Open Render Dashboard → smart-bus-api → Shell
#   3. Paste / run this script:
#         bash <(curl -fsSL https://raw.githubusercontent.com/navodyaishari0-hash/smart-bus-system/main/scripts/seed-render.sh)
#
# What it does:
#   - Runs the Sequelize seed script (node seed.js) which populates all tables
#     with 50 conductors, 50 buses, 11 routes, 70+ schedules, and ~2,450 seats.
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

echo -e "${BOLD}${YELLOW}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   Smart Bus System — Render Database Seeder     ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Verify we are inside the backend directory ──────────────────────────
if [ ! -f "package.json" ]; then
  if [ -f "backend/package.json" ]; then
    echo -e "${YELLOW}➜  Changing to backend/ directory ...${NC}"
    cd backend
  else
    echo -e "${RED}✘  Cannot find package.json.  Run this from the repo root or backend/.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✔  Working directory: $(pwd)${NC}"

# ── 2. Verify environment variables ────────────────────────────────────────
echo ""
echo -e "${BOLD}Checking environment variables ...${NC}"

REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_PASS" "DB_NAME" "DB_DIALECT")
MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "  ${RED}✘  $var is not set${NC}"
    MISSING=1
  else
    echo -e "  ${GREEN}✔  $var = ${!var:0:20}...${NC}"
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo -e "${RED}✘  Missing required environment variables.  Are you running inside Render Shell?${NC}"
  echo "    Render auto-injects DB_HOST, DB_USER, DB_PASS, DB_NAME from the database service."
  exit 1
fi

# ── 3. Wait for the database to be reachable ────────────────────────────────
echo ""
echo -e "${BOLD}Waiting for database connection ...${NC}"

RETRIES=12
until node -e "
  const { Sequelize } = require('sequelize');
  const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST, dialect: 'postgres',
    dialectOptions: { ssl: { rejectUnauthorized: false } },
    logging: false
  });
  s.authenticate().then(() => { console.log('OK'); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo -e "${RED}✘  Database not reachable after 60 seconds.  Check your Render PostgreSQL dashboard.${NC}"
    exit 1
  fi
  echo -e "  ${YELLOW}Waiting for PostgreSQL to accept connections ...${NC}"
  sleep 5
done

echo -e "${GREEN}✔  PostgreSQL is reachable${NC}"

# ── 4. Run the Sequelize seed script ───────────────────────────────────────
echo ""
echo -e "${BOLD}Running seed script (node seed.js) ...${NC}"
echo -e "${YELLOW}  This creates tables, 50 conductors, 50 buses, 11 routes, 70+ schedules, and seats.${NC}"
echo -e "${YELLOW}  It may take 30-60 seconds.${NC}"
echo ""

# The seed.js calls sequelize.sync({ force: true }) which drops & recreates all
# tables, so the data is always fresh.
node seed.js

echo ""
echo -e "${GREEN}${BOLD}✔  Database seeded successfully!${NC}"
echo ""
echo -e "  You can now test the API:"
echo -e "    curl ${RENDER_EXTERNAL_URL:-https://smart-bus-api.onrender.com}/api/routes"
echo ""
echo -e "  Login credentials:"
echo -e "    Admin:      admin@smartbus.com / password123"
echo -e "    Conductor:  nimal@smartbus.com / pass123"
echo -e "    Passenger:  alice@example.com  / password123"
echo ""
