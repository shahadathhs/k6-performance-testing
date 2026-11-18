#!/usr/bin/env bash
# ── First-time setup ─────────────────────────────────────────────────
# Verifies global prerequisites, installs workspace dependencies, and
# starts the self-hosted QuickPizza target.
#
# Global prerequisites this script checks for:
#   git, make, docker, node (≥ 20), pnpm (10), k6
#
# OS behavior (detected via uname):
#   macOS   — auto-installs k6/node via brew, pnpm via corepack
#   Linux   — checks everything; prints exact install commands for
#             anything missing (never runs sudo on its own)
#   Windows — run from WSL2, or Git Bash: checks still work, hints
#             point to choco/scoop; WSL2 is recommended
#
#   ./scripts/setup.sh        (or: make setup)
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[2m'; NC='\033[0m'
have() { command -v "$1" >/dev/null 2>&1; }
ok()   { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
miss() { printf "  ${RED}✗${NC} %s\n" "$1"; }
hint() { printf "    ${DIM}→ %s${NC}\n" "$1"; }

OS="$(uname -s)"
case "$OS" in
  Darwin)      PLATFORM="macos" ;;
  Linux)       PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*)
               PLATFORM="windows" ;;
  *)           PLATFORM="unknown" ;;
esac
echo "Detected platform: $PLATFORM"
if [ "$PLATFORM" = "windows" ]; then
  hint "Windows works best via WSL2 (recommended) — https://learn.microsoft.com/windows/wsl/"
fi

echo "Checking prerequisites…"

# ── git + make ────────────────────────────────────────────────────────
if have git; then ok "git $(git --version | cut -d' ' -f3)"; else
  miss "git"
  case "$PLATFORM" in
    macos)   hint "xcode-select --install" ;;
    linux)   hint "sudo apt install git  # or: sudo dnf install git" ;;
    windows) hint "winget install Git.Git  # or: choco install git" ;;
  esac
  exit 1
fi
if have make; then ok "make"; else
  miss "make"
  case "$PLATFORM" in
    macos)   hint "xcode-select --install" ;;
    linux)   hint "sudo apt install build-essential  # or: sudo dnf install make" ;;
    windows) hint "install via WSL2, or: choco install make" ;;
  esac
  exit 1
fi

# ── Homebrew (auto-install path — macOS, or Linux if brew is present) ─
BREW=""
if have brew; then BREW="yes"; ok "brew (auto-install available)"; fi

# ── Node.js ≥ 20 ──────────────────────────────────────────────────────
if have node; then
  NODE_MAJOR="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
  if [ "$NODE_MAJOR" -ge 20 ]; then ok "node $(node -v)"; else
    miss "node ≥ 20 required (found $(node -v))"
    hint "upgrade via https://nodejs.org/ or your version manager (nvm/fnm)"
    exit 1
  fi
elif [ -n "$BREW" ]; then
  echo "  … installing node via brew"
  brew install node >/dev/null && ok "node $(node -v) (installed)"
else
  miss "node"
  case "$PLATFORM" in
    linux)   hint "sudo apt install nodejs  # or via nvm: https://github.com/nvm-sh/nvm" ;;
    windows) hint "winget install OpenJS.NodeJS.LTS  # or: choco install nodejs-lts" ;;
    *)       hint "https://nodejs.org/en/download" ;;
  esac
  exit 1
fi

# ── pnpm 10 (via corepack, pinned by the packageManager field) ────────
if have pnpm; then ok "pnpm $(pnpm --version)"
elif corepack --version >/dev/null 2>&1; then
  echo "  … activating pnpm via corepack"
  corepack enable >/dev/null 2>&1 || true
  corepack install >/dev/null 2>&1 || npm install -g pnpm@10 >/dev/null
  ok "pnpm $(pnpm --version)"
else
  miss "pnpm"
  hint "npm install -g pnpm@10"
  exit 1
fi

# ── Docker (never auto-installed — needs a manual setup everywhere) ───
if have docker; then ok "docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
  miss "docker"
  case "$PLATFORM" in
    macos|windows) hint "https://www.docker.com/products/docker-desktop/" ;;
    linux)         hint "https://docs.docker.com/engine/install/" ;;
  esac
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  miss "docker daemon is not running"
  hint "start Docker Desktop (macOS/Windows) or: sudo systemctl start docker (Linux)"
  exit 1
fi

# ── k6 CLI (global — scenarios run directly, only the target is Docker) ─
if have k6; then ok "k6 $(k6 version | cut -d' ' -f2)"
elif [ -n "$BREW" ]; then
  echo "  … installing k6 via brew"
  brew install k6 >/dev/null && ok "k6 $(k6 version | cut -d' ' -f2) (installed)"
else
  miss "k6"
  case "$PLATFORM" in
    linux)
      hint "Debian/Ubuntu:  sudo snap install k6"
      hint "or apt/dnf — full steps: https://grafana.com/docs/k6/latest/set-up/install/" ;;
    windows) hint "choco install k6  # or: scoop install k6" ;;
    *)       hint "https://grafana.com/docs/k6/latest/set-up/install/" ;;
  esac
  exit 1
fi

# ── Workspace + test target ───────────────────────────────────────────
echo "Installing workspace dependencies…"
pnpm install

echo "Starting the self-hosted QuickPizza target…"
docker compose up -d quickpizza >/dev/null 2>&1 || docker compose up -d quickpizza

echo ""
printf "${GREEN}Setup complete.${NC}\n"
echo "  Test target : http://localhost:3333  (QuickPizza — browse it!)"
echo "  Try it out  : k6 run intro/smoke-test.ts"
echo "  Dashboard   : K6_WEB_DASHBOARD=true k6 run intro/load-test.ts"
