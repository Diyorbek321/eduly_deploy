#!/usr/bin/env bash
# Run this script on macOS with Xcode installed.
# It adds the iOS target, syncs, and opens Xcode.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing dependencies..."
npm install

echo "==> Building web assets..."
npm run build

echo "==> Adding iOS platform..."
npx cap add ios

echo "==> Syncing to iOS..."
npx cap sync ios

echo "==> Opening Xcode..."
npx cap open ios

echo ""
echo "In Xcode:"
echo "  1. Select 'App' target → Signing & Capabilities"
echo "  2. Set your Team (Apple Developer account)"
echo "  3. Enable 'Push Notifications' capability"
echo "  4. Enable 'Background Modes' → Remote notifications"
echo "  5. Product → Archive → Distribute App → TestFlight"
