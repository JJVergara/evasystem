# Claude Code Timer Keeper

Automated system to keep Claude Code's 5-hour usage reset timer always running, so it resets sooner rather than waiting for your first message of the day.

---

## How It Works

Claude Code's usage resets every 5 hours **after your first message**. If you don't send a message, the timer doesn't start. This system sends a minimal ping (`.`) every hour to keep the timer active.

---

## Part 1: Hourly Ping (LaunchAgent)

A launchd job that runs every hour, sending a `.` to Claude Code.

### Files

| File | Purpose |
|------|---------|
| `~/Library/LaunchAgents/com.claude.timer-keeper.plist` | LaunchAgent config |
| `/tmp/claude-timer-keeper.out` | Output log |
| `/tmp/claude-timer-keeper.err` | Error log |

### Check Status

```bash
launchctl list | grep claude.timer-keeper
```

Output meaning:
- `PID  0  com.claude.timer-keeper` → Running successfully (0 = last exit code)
- `-    0  com.claude.timer-keeper` → Not currently running, last run succeeded
- `-  126  com.claude.timer-keeper` → Error (126 = command not found)

### Check Last Run Time

```bash
stat -f "Last run: %Sm" /tmp/claude-timer-keeper.out
```

### Check Output

```bash
cat /tmp/claude-timer-keeper.out
```

### Manually Trigger Now

```bash
launchctl kickstart gui/$(id -u)/com.claude.timer-keeper
```

### Start/Stop/Reload

```bash
launchctl load ~/Library/LaunchAgents/com.claude.timer-keeper.plist

launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist

launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist && \
launchctl load ~/Library/LaunchAgents/com.claude.timer-keeper.plist
```

### Reinstall From Scratch

```bash
cat > ~/Library/LaunchAgents/com.claude.timer-keeper.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.timer-keeper</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/claude</string>
        <string>-p</string>
        <string>.</string>
        <string>--max-turns</string>
        <string>1</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/claude-timer-keeper.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-timer-keeper.err</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.claude.timer-keeper.plist
```

### Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist
rm ~/Library/LaunchAgents/com.claude.timer-keeper.plist
```

---

## Part 2: Overnight Wake & Sleep (pmset + LaunchAgent)

Makes the Mac wake at 6:00am, run the ping, then sleep at 6:02am.

### Components

| Component | Purpose |
|-----------|---------|
| `pmset repeat wakeorpoweron` | Wakes Mac at 6:00am daily |
| `com.claude.timer-sleep.plist` | Puts Mac to sleep at 6:02am |

### Check Wake Schedule

```bash
pmset -g sched
```

Expected output:
```
Repeating power events:
  wakepoweron at 6:00AM every day
```

### Check Sleep Job Status

```bash
launchctl list | grep claude.timer-sleep
```

### Change Wake Time

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 04:00:00

launchctl unload ~/Library/LaunchAgents/com.claude.timer-sleep.plist

cat > ~/Library/LaunchAgents/com.claude.timer-sleep.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.timer-sleep</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/pmset</string>
        <string>sleepnow</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>4</integer>
        <key>Minute</key>
        <integer>2</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/claude-timer-sleep.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-timer-sleep.err</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.claude.timer-sleep.plist
```

### Reinstall Sleep Job (6:02am)

```bash
cat > ~/Library/LaunchAgents/com.claude.timer-sleep.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.timer-sleep</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/pmset</string>
        <string>sleepnow</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>2</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/claude-timer-sleep.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-timer-sleep.err</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.claude.timer-sleep.plist
```

### Uninstall Wake/Sleep

```bash
sudo pmset repeat cancel

launchctl unload ~/Library/LaunchAgents/com.claude.timer-sleep.plist
rm ~/Library/LaunchAgents/com.claude.timer-sleep.plist
```

---

## Quick Status Check (All Components)

```bash
echo "=== Hourly Ping Job ===" && \
launchctl list | grep claude.timer-keeper && \
echo "" && \
echo "=== Sleep Job ===" && \
launchctl list | grep claude.timer-sleep && \
echo "" && \
echo "=== Wake Schedule ===" && \
pmset -g sched | grep -A1 "Repeating" && \
echo "" && \
echo "=== Last Ping ===" && \
stat -f "%Sm" /tmp/claude-timer-keeper.out 2>/dev/null || echo "Never run"
```

---

## Daily Flow

```
┌─────────────────────────────────────────────┐
│              YOUR DAILY TIMELINE            │
├─────────────────────────────────────────────┤
│ 11:00pm  You close laptop / sleep           │
│    ↓                                        │
│ 6:00am   Mac wakes automatically            │
│ 6:00am   Claude ping runs (timer active)    │
│ 6:02am   Mac goes back to sleep             │
│    ↓                                        │
│ 8:00am   You wake up, timer already running │
│ 9:00am   Hourly ping                        │
│ 10:00am  Hourly ping                        │
│   ...    (continues every hour)             │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### Job not running

```bash
cat /tmp/claude-timer-keeper.err
```

### Claude path changed

Find new path and update plist:
```bash
which claude

launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist
nano ~/Library/LaunchAgents/com.claude.timer-keeper.plist
launchctl load ~/Library/LaunchAgents/com.claude.timer-keeper.plist
```

### Mac not waking at scheduled time

- Check if "Low Power Mode" is disabled
- Check System Settings > Battery > Options > "Wake for network access"
- Verify schedule: `pmset -g sched`

### Sleep job running while using computer at 6am

Change to an earlier time (e.g., 4am) using the "Change Wake Time" instructions above.

---

## Files Summary

| Path | Description |
|------|-------------|
| `~/Library/LaunchAgents/com.claude.timer-keeper.plist` | Hourly ping job |
| `~/Library/LaunchAgents/com.claude.timer-sleep.plist` | 6:02am sleep job |
| `/tmp/claude-timer-keeper.out` | Ping output log |
| `/tmp/claude-timer-keeper.err` | Ping error log |
| `/tmp/claude-timer-sleep.out` | Sleep job output |
| `/tmp/claude-timer-sleep.err` | Sleep job errors |
