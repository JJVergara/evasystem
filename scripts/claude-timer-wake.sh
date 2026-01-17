#!/bin/bash

LOG_FILE="$HOME/.claude-timer-keeper.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

log "=== Wake cycle triggered ==="

/opt/homebrew/bin/claude -p "." --max-turns 1 2>/dev/null

if [ $? -eq 0 ]; then
    log "Claude ping successful"
else
    log "Claude ping failed (may require auth)"
fi

NEXT_WAKE=$(date -v+35M "+%m/%d/%Y %H:%M:%S")
sudo pmset schedule wake "$NEXT_WAKE" 2>/dev/null

if [ $? -eq 0 ]; then
    log "Next wake scheduled for: $NEXT_WAKE"
else
    log "Failed to schedule next wake (sudo required)"
fi

tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
