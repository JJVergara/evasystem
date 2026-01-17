# Claude Code Timer Keeper

Automated system to keep Claude Code's 5-hour usage reset timer always running, even when your Mac is sleeping with the lid closed.

---

## How It Works

Claude Code's usage resets every 5 hours **after your first message**. If you don't send a message, the timer doesn't start. This system:

1. Sends a minimal ping (`.`) every 30 minutes to keep the timer active
2. Schedules the next wake 35 minutes ahead, so even with lid closed, the Mac wakes up
3. After each ping, Mac naturally returns to sleep due to inactivity

This creates a self-sustaining cycle that keeps your timer running 24/7.

---

## Components

| Component | Purpose |
|-----------|---------|
| `scripts/claude-timer-wake.sh` | Pings Claude + schedules next wake |
| `com.claude.timer-keeper.plist` | LaunchAgent running at :00 and :30 |
| `pmset repeat 6am` | Daily fallback wake |
| `/etc/sudoers.d/pmset-claude` | Passwordless sudo for pmset |

---

## Daily Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-SUSTAINING WAKE CYCLE                   │
├─────────────────────────────────────────────────────────────────┤
│ 11:00pm  You close laptop (Mac sleeps)                          │
│    ↓                                                            │
│ 11:30pm  Mac wakes → ping → schedules 12:05am → sleeps          │
│ 12:05am  Mac wakes → ping → schedules 12:40am → sleeps          │
│ 12:40am  Mac wakes → ping → schedules 1:15am  → sleeps          │
│   ...    (continues every ~35 minutes all night)                │
│    ↓                                                            │
│ 8:00am   You open laptop - timer has been running all night!    │
│ 8:30am   Regular ping (you're working)                          │
│ 9:00am   Regular ping                                           │
│   ...    (continues every 30 minutes)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Check Status

### All Components
```bash
echo "=== Ping Job ===" && \
launchctl list | grep claude.timer-keeper && \
echo "" && \
echo "=== Wake Schedule ===" && \
pmset -g sched && \
echo "" && \
echo "=== Recent Log ===" && \
tail -10 ~/.claude-timer-keeper.log
```

### Just Scheduled Wakes
```bash
pmset -g sched
```

### Recent Activity Log
```bash
cat ~/.claude-timer-keeper.log
```

---

## Manual Operations

### Trigger Ping Now
```bash
launchctl kickstart gui/$(id -u)/com.claude.timer-keeper
```

### Reload LaunchAgent
```bash
launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist && \
launchctl load ~/Library/LaunchAgents/com.claude.timer-keeper.plist
```

### Clear All Scheduled Wakes
```bash
sudo pmset schedule cancelall
```

---

## Installation

### 1. Passwordless sudo for pmset
```bash
echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/bin/pmset" | sudo tee /etc/sudoers.d/pmset-claude
```

### 2. Install LaunchAgent
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
        <string>/Users/juanvergara/Desktop/Otros/otros/evasystem/scripts/claude-timer-wake.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict>
            <key>Minute</key>
            <integer>0</integer>
        </dict>
        <dict>
            <key>Minute</key>
            <integer>30</integer>
        </dict>
    </array>
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

### 3. Set 6am Daily Fallback Wake
```bash
sudo pmset repeat wakeorpoweron MTWRFSU 06:00:00
```

---

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.claude.timer-keeper.plist
rm ~/Library/LaunchAgents/com.claude.timer-keeper.plist

sudo pmset repeat cancel
sudo pmset schedule cancelall

sudo rm /etc/sudoers.d/pmset-claude
```

---

## Files Summary

| Path | Description |
|------|-------------|
| `scripts/claude-timer-wake.sh` | Main script (ping + schedule) |
| `~/Library/LaunchAgents/com.claude.timer-keeper.plist` | LaunchAgent config |
| `~/.claude-timer-keeper.log` | Activity log |
| `/tmp/claude-timer-keeper.out` | stdout output |
| `/tmp/claude-timer-keeper.err` | stderr output |
| `/etc/sudoers.d/pmset-claude` | Passwordless sudo config |

---

## Troubleshooting

### Wake not scheduling
Check sudo is working:
```bash
sudo pmset schedule wake "$(date -v+1M '+%m/%d/%Y %H:%M:%S')"
pmset -g sched
```

### Mac not waking from sleep
- Ensure Mac is in **sleep mode**, not powered off
- Check battery settings: System Settings > Battery > Options > "Wake for network access"
- Verify schedule exists: `pmset -g sched`

### LaunchAgent not running
```bash
launchctl list | grep claude.timer-keeper
cat /tmp/claude-timer-keeper.err
```

### Claude path changed
```bash
which claude
```
Then update the path in `scripts/claude-timer-wake.sh`.
