#!/bin/bash

LOG_FILE="$HOME/.claude-timer-keeper.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Sending ping to Claude Code to keep timer active..." >> "$LOG_FILE"

/opt/homebrew/bin/claude -p "." --max-turns 1 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Timer ping successful" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] Timer ping failed (may require auth)" >> "$LOG_FILE"
fi

tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
