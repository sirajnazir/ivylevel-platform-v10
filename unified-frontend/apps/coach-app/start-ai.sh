#!/bin/bash
# Script to start the AI-powered coaching application

echo "🚀 Starting AI Coach Pro..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "Please ensure your Firebase configuration is set up."
    echo ""
fi

# Backup current index.js and use AI version
if [ -f "src/index.js" ]; then
    cp src/index.js src/index-backup.js
fi
cp src/index-ai.js src/index.js

# Backup current App.js and use AI version
if [ -f "src/App.js" ]; then
    cp src/App.js src/App-backup.js
fi
cp src/App-AI.js src/App.js

echo "✅ Configuration updated for AI features"
echo ""
echo "🧠 Starting AI Coach Pro on http://localhost:3000"
echo ""
echo "Available features:"
echo "  • AI Coaching Assistant with real-time insights"
echo "  • Smart Resource Recommendations"
echo "  • Automated Session Planning"
echo "  • YouTube-style Training Interface"
echo "  • Predictive Analytics Dashboard"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm start