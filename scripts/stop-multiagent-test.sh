#!/bin/bash

# Stop MultiAgent Test Environment

echo "🛑 Stopping MultiAgent test servers..."
echo ""

# Try to kill using saved PIDs first
if [ -f .multiagent-pids ]; then
    echo "📋 Found saved PIDs..."
    PIDS=$(cat .multiagent-pids)
    kill $PIDS 2>/dev/null
    rm .multiagent-pids
    echo "   ✓ Killed processes: $PIDS"
fi

# Also kill by port to ensure cleanup
echo "🧹 Cleaning up ports 5173 and 8787..."
lsof -ti tcp:5173 tcp:8787 2>/dev/null | xargs kill -9 2>/dev/null

sleep 1

# Verify all stopped
REMAINING=$(lsof -ti tcp:5173 tcp:8787 2>/dev/null)
if [ -z "$REMAINING" ]; then
    echo ""
    echo "✅ All servers stopped successfully!"
else
    echo ""
    echo "⚠️  Some processes still running: $REMAINING"
    echo "   Run: kill -9 $REMAINING"
fi

echo ""
