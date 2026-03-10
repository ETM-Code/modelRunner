#!/usr/bin/env bash
# First-time server setup for modelRunner
# Usage: ./setup.sh [--repo <git-url>] [--dir <install-dir>]
#
# Installs bun, clones the repo, and installs dependencies.
# Safe to re-run — skips steps that are already done.

set -euo pipefail

REPO_URL="https://github.com/ETM-Code/modelRunner.git"
INSTALL_DIR="$HOME/modelrunner"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)  REPO_URL="$2"; shift 2 ;;
    --dir)   INSTALL_DIR="$2"; shift 2 ;;
    *)       echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "==> modelRunner setup"
echo "    repo: $REPO_URL"
echo "    dir:  $INSTALL_DIR"
echo

# 1. Install bun if missing
if ! command -v bun &>/dev/null; then
  echo "==> Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo "    bun installed: $(bun --version)"
else
  echo "==> bun already installed: $(bun --version)"
fi

# 2. Ensure tmux is available
if ! command -v tmux &>/dev/null; then
  echo "==> Installing tmux..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq tmux
  elif command -v yum &>/dev/null; then
    sudo yum install -y tmux
  elif command -v brew &>/dev/null; then
    brew install tmux
  else
    echo "ERROR: Cannot install tmux. Install it manually and re-run."
    exit 1
  fi
else
  echo "==> tmux already installed: $(tmux -V)"
fi

# 3. Clone or update repo
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Updating existing repo..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo "==> Cloning repo..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# 4. Install dependencies
echo "==> Installing dependencies..."
bun install

# 5. Link CLI globally
echo "==> Linking modelrunner CLI..."
bun link

# 6. Create session storage dir
mkdir -p "$HOME/.modelrunner/sessions"

echo
echo "==> Setup complete!"
echo "    Run 'modelrunner --help' to verify."
echo "    Run 'modelrunner serve' or use scripts/server.sh to manage the server."
