#!/bin/bash

# Start MultiAgent Test Environment
# All servers killed, starting fresh with correct ports

echo "🧹 Cleaning up old servers..."
lsof -ti tcp:5173 tcp:8787 2>/dev/null | xargs kill -9 2>/dev/null
sleep 2

echo ""
echo "✅ All servers killed"
echo ""
echo "📋 Starting services with correct configuration:"
echo "   - Frontend (Vite): http://localhost:5173"
echo "   - Agent Framework: http://localhost:8787"
echo "   - Proxy: /api/v26/* → http://localhost:8787/api/v26/*"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the right directory
if [ ! -d "services/agent-framework" ] || [ ! -d "unified-frontend" ]; then
    echo "❌ Error: Must run from project root (/Users/snazir/ivylevel-platform-v10)"
    exit 1
fi

# Start agent-framework backend in background
echo "🚀 Starting Agent Framework Backend (port 8787)..."
cd services/agent-framework
tsx src/server-utfa.ts > ../../logs/agent-framework.log 2>&1 &
BACKEND_PID=$!
echo "   ✓ Agent Framework started (PID: $BACKEND_PID)"
cd ../..

# Wait for backend to start
echo "   Waiting for backend to be ready..."
sleep 3

# Check if backend is running
if lsof -ti tcp:8787 >/dev/null 2>&1; then
    echo "   ✓ Backend is listening on port 8787"
else
    echo "   ❌ Backend failed to start. Check logs/agent-framework.log"
    exit 1
fi

echo ""

# Start frontend
echo "🎨 Starting Unified Frontend (port 5173)..."
cd unified-frontend
npm run dev > ../logs/unified-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   ✓ Frontend started (PID: $FRONTEND_PID)"
cd ..

# Wait for frontend to start
echo "   Waiting for frontend to be ready..."
sleep 5

# Check if frontend is running
if lsof -ti tcp:5173 >/dev/null 2>&1; then
    echo "   ✓ Frontend is listening on port 5173"
else
    echo "   ❌ Frontend failed to start. Check logs/unified-frontend.log"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ ALL SYSTEMS READY!"
echo ""
echo "📍 Access the MultiAgent UI:"
echo "   👉 http://localhost:5173/student"
echo "   Then click: MultiAgents tab"
echo ""
echo "🔍 Monitor logs:"
echo "   tail -f logs/agent-framework.log"
echo "   tail -f logs/unified-frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   OR: lsof -ti tcp:5173 tcp:8787 | xargs kill"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "PIDs saved to .multiagent-pids for easy cleanup"
echo "$BACKEND_PID $FRONTEND_PID" > .multiagent-pids
