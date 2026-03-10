#!/usr/bin/env bash
# Manage modelRunner server in a tmux session
#
# Usage: ./server.sh <command> [options]
#
# Commands:
#   start     Start the server in a tmux session
#   stop      Stop the server and kill the tmux session
#   restart   Stop then start
#   status    Check if the server is running
#   attach    Attach to the tmux session (interactive)
#   logs      Show recent output from the tmux pane
#   run       Run a modelrunner command in a new tmux window
#
# Options:
#   --port <port>         Server port (default: 7420)
#   --session <name>      tmux session name (default: modelrunner)
#   --dir <path>          modelRunner install directory (default: ~/modelrunner)

set -euo pipefail

# Ensure bun is in PATH (tmux non-login shells may not source .zshrc/.bashrc)
if [[ -d "$HOME/.bun/bin" ]]; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

PORT="${MODELRUNNER_PORT:-7420}"
SESSION="${MODELRUNNER_SESSION:-modelrunner}"
DIR="${MODELRUNNER_DIR:-$HOME/modelrunner}"
LOG_FILE="$HOME/.modelrunner/server.log"

# Parse options (after the command)
COMMAND="${1:-help}"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)    PORT="$2"; shift 2 ;;
    --session) SESSION="$2"; shift 2 ;;
    --dir)     DIR="$2"; shift 2 ;;
    *)         break ;;
  esac
done

ensure_dir() {
  mkdir -p "$HOME/.modelrunner"
}

case "$COMMAND" in
  start)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "Session '$SESSION' already running."
      echo "Use 'server.sh attach' to connect or 'server.sh restart' to restart."
      exit 0
    fi

    ensure_dir

    echo "Starting modelrunner server on port $PORT in tmux session '$SESSION'..."
    tmux new-session -d -s "$SESSION" -c "$DIR" \
      "export PATH=\"\$HOME/.bun/bin:\$PATH\"; bun run src/index.ts serve --port $PORT 2>&1 | tee -a $LOG_FILE"

    sleep 1
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "Server started. Port: $PORT, Session: $SESSION"
      echo "  attach:  server.sh attach --session $SESSION"
      echo "  status:  server.sh status --session $SESSION"
      echo "  logs:    server.sh logs --session $SESSION"
    else
      echo "ERROR: Server failed to start. Check $LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "Stopping session '$SESSION'..."
      tmux kill-session -t "$SESSION"
      echo "Stopped."
    else
      echo "Session '$SESSION' is not running."
    fi
    ;;

  restart)
    "$0" stop --session "$SESSION"
    sleep 1
    "$0" start --port "$PORT" --session "$SESSION" --dir "$DIR"
    ;;

  status)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "Session '$SESSION' is running."
      echo
      # Show last few lines of output
      tmux capture-pane -t "$SESSION" -p | tail -5
    else
      echo "Session '$SESSION' is not running."
      exit 1
    fi
    ;;

  attach)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      exec tmux attach-session -t "$SESSION"
    else
      echo "Session '$SESSION' is not running. Start it first with: server.sh start"
      exit 1
    fi
    ;;

  logs)
    LINES="${1:-50}"
    if [[ -f "$LOG_FILE" ]]; then
      tail -n "$LINES" "$LOG_FILE"
    else
      echo "No log file found at $LOG_FILE"
      # Try capturing from tmux pane
      if tmux has-session -t "$SESSION" 2>/dev/null; then
        echo "Capturing from tmux pane:"
        tmux capture-pane -t "$SESSION" -p
      fi
    fi
    ;;

  run)
    # Run a modelrunner command in a new tmux window within the session
    if ! tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "Session '$SESSION' is not running. Start it first."
      exit 1
    fi

    if [[ $# -eq 0 ]]; then
      echo "Usage: server.sh run <modelrunner args...>"
      echo "Example: server.sh run debate 'Should AI be open source?' --max-rounds 3"
      exit 1
    fi

    WINDOW_NAME="mr-$(date +%H%M%S)"
    echo "Running in new tmux window '$WINDOW_NAME': modelrunner $*"
    tmux new-window -t "$SESSION" -n "$WINDOW_NAME" -c "$DIR" \
      "export PATH=\"\$HOME/.bun/bin:\$PATH\"; bun run src/index.ts $* ; echo '--- Done. Press enter to close ---'; read"
    ;;

  help|--help|-h)
    cat <<'USAGE'
modelRunner server manager

Usage: server.sh <command> [options]

Commands:
  start     Start the API server in a tmux session
  stop      Stop the server
  restart   Stop + start
  status    Check if running and show recent output
  attach    Attach to the tmux session (interactive)
  logs      Show recent log output (default: last 50 lines)
  run       Run a modelrunner command in a new tmux window

Options:
  --port <port>         Server port (default: 7420, or $MODELRUNNER_PORT)
  --session <name>      tmux session name (default: modelrunner, or $MODELRUNNER_SESSION)
  --dir <path>          Install directory (default: ~/modelrunner, or $MODELRUNNER_DIR)

Environment variables:
  MODELRUNNER_PORT      Default port
  MODELRUNNER_SESSION   Default tmux session name
  MODELRUNNER_DIR       Default install directory

Examples:
  server.sh start --port 8080
  server.sh run debate "Is Rust better than Go?" --max-rounds 3
  server.sh attach
  server.sh logs 100
USAGE
    ;;

  *)
    echo "Unknown command: $COMMAND"
    echo "Run 'server.sh help' for usage."
    exit 1
    ;;
esac
