#!/bin/bash

# Setup systemd service for auto-start on reboot
# This script must be run with sudo

set -e

echo "🔧 SimpleLog Auto-Start Setup"
echo "=============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Get the actual user (not root)
if [ -n "$SUDO_USER" ]; then
    ACTUAL_USER=$SUDO_USER
else
    ACTUAL_USER=$(whoami)
fi

# Get the current directory
CURRENT_DIR=$(pwd)

echo "📋 Configuration:"
echo "   - User: $ACTUAL_USER"
echo "   - Working Directory: $CURRENT_DIR"
echo ""

# Update the service file with the correct path
SERVICE_FILE="simplelog.service"
TEMP_SERVICE_FILE="/tmp/simplelog.service.tmp"

# For macOS (using launchd instead of systemd)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS - Setting up launchd service..."

    PLIST_FILE="com.simplelog.app.plist"
    PLIST_PATH="/Library/LaunchDaemons/$PLIST_FILE"

    # Create plist file
    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.simplelog.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/docker-compose</string>
        <string>-f</string>
        <string>$CURRENT_DIR/docker-compose.yml</string>
        <string>up</string>
        <string>-d</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$CURRENT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/simplelog.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/simplelog.err.log</string>
</dict>
</plist>
EOF

    # Set permissions
    chmod 644 "$PLIST_PATH"
    chown root:wheel "$PLIST_PATH"

    # Load the service
    launchctl load "$PLIST_PATH"

    echo "✅ Auto-start configured successfully!"
    echo ""
    echo "📝 Useful commands:"
    echo "   - Check status:  sudo launchctl list | grep simplelog"
    echo "   - Stop service:  sudo launchctl unload $PLIST_PATH"
    echo "   - Start service: sudo launchctl load $PLIST_PATH"
    echo "   - View logs:     tail -f /tmp/simplelog.*.log"

# For Linux (using systemd)
else
    echo "🐧 Detected Linux - Setting up systemd service..."

    # Update WorkingDirectory in service file
    sed "s|WorkingDirectory=.*|WorkingDirectory=$CURRENT_DIR|g" "$SERVICE_FILE" > "$TEMP_SERVICE_FILE"

    # Copy service file to systemd directory
    cp "$TEMP_SERVICE_FILE" /etc/systemd/system/simplelog.service
    rm "$TEMP_SERVICE_FILE"

    # Reload systemd
    systemctl daemon-reload

    # Enable the service
    systemctl enable simplelog.service

    # Start the service
    systemctl start simplelog.service

    echo "✅ Auto-start configured successfully!"
    echo ""
    echo "📝 Useful commands:"
    echo "   - Check status:  sudo systemctl status simplelog"
    echo "   - Stop service:  sudo systemctl stop simplelog"
    echo "   - Start service: sudo systemctl start simplelog"
    echo "   - View logs:     sudo journalctl -u simplelog -f"
    echo "   - Disable auto-start: sudo systemctl disable simplelog"
fi

echo ""
echo "🎉 SimpleLog will now start automatically on system reboot!"
