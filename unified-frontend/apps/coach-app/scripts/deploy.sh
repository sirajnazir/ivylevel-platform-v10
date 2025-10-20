#!/bin/bash

# IvyLevel Coach Training Platform - Production Deployment Script

echo "🚀 Starting IvyLevel Coach Training deployment..."

# Check if production environment is set
if [ ! -f .env.production.local ]; then
    echo "❌ Error: .env.production.local not found!"
    echo "Please create it from .env.production template"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test -- --watchAll=false --passWithNoTests

# Build for production
echo "🔨 Building for production..."
npm run build

# Check build size
echo "📊 Build size analysis:"
du -sh build/

# Deploy to Firebase Hosting (optional)
read -p "Deploy to Firebase Hosting? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔥 Deploying to Firebase..."
    firebase deploy --only hosting
fi

echo "✅ Deployment complete!"