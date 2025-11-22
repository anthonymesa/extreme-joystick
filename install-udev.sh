#!/bin/bash

RULE_FILE="/etc/udev/rules.d/99-joystick.rules"
VENDOR="046d"
PRODUCT="c215"

echo "Installing udev rule for Logitech joystick..."

echo "SUBSYSTEM==\"hidraw\", ATTRS{idVendor}==\"$VENDOR\", ATTRS{idProduct}==\"$PRODUCT\", MODE=\"0666\"" \
  > $RULE_FILE

echo "Reloading udev rules..."
udevadm control --reload-rules
udevadm trigger

echo "Done. Unplug and replug your joystick."

