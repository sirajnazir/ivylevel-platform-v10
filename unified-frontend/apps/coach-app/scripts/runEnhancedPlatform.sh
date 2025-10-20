#!/bin/bash

echo "🚀 IvyLevel Enhanced Coach Training Platform Launcher"
echo "=================================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating a sample .env file..."
    cat > .env << EOL
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Knowledge Base Configuration
REACT_APP_KB_ROOT_DRIVE_ID=1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg
EOL
    echo "✅ Created .env file - Please update it with your Firebase credentials"
    echo ""
fi

# Menu
echo "What would you like to do?"
echo "1) Initialize Firebase with Knowledge Base schema"
echo "2) Start the development server"
echo "3) Build for production"
echo "4) Run both initialization and start server"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔥 Initializing Firebase Knowledge Base..."
        node scripts/initializeKnowledgeBase.js
        ;;
    2)
        echo ""
        echo "🌟 Starting Enhanced Platform..."
        echo "Once started, access the platform at:"
        echo "  - Home: http://localhost:3000"
        echo "  - Enhanced KB Onboarding: http://localhost:3000/#enhanced-onboarding"
        echo ""
        npm start
        ;;
    3)
        echo ""
        echo "🏗️  Building for production..."
        npm run build
        ;;
    4)
        echo ""
        echo "🔥 Initializing Firebase Knowledge Base..."
        node scripts/initializeKnowledgeBase.js
        echo ""
        echo "🌟 Starting Enhanced Platform..."
        echo "Once started, access the platform at:"
        echo "  - Home: http://localhost:3000"
        echo "  - Enhanced KB Onboarding: http://localhost:3000/#enhanced-onboarding"
        echo ""
        npm start
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac