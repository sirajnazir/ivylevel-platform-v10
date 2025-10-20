# Running the Enhanced IvyLevel Coach Training Platform

## Quick Start

### 1. Start the Platform

```bash
npm start
```

The platform will open at `http://localhost:3000`

### 2. Access Enhanced Features

Once the platform is running, you have two options:

#### Option A: From Home Screen
Click the **"Enhanced KB Onboarding 🚀"** button (purple button next to the green "Launch Smart Onboarding System" button)

#### Option B: Direct URL
Navigate to: `http://localhost:3000/#enhanced-onboarding`

## Firebase Setup

The platform needs Firebase to be configured with the Knowledge Base schema. Currently, the Firebase collections need to match our schema:

### Required Collections:
- `recordings` - Coaching session metadata
- `insights` - AI-generated insights  
- `coaches` - Coach profiles
- `students` - Student profiles
- `programs` - Program definitions
- `gamePlans` - Game plan documents
- `executionDocs` - Execution tracking documents

### Current Status

Right now, the platform is using the existing Firebase setup. To fully integrate with the Knowledge Base:

1. **Check your Firebase Console** at https://console.firebase.google.com
2. **Verify these collections exist** with the proper schema
3. **Import recording data** from your Google Sheets/Drive

## What You'll See

### Without Firebase KB Data:
- The UI will load properly
- Components will render
- But no real coaching data will appear
- You'll see empty states or loading indicators

### With Firebase KB Data:
- Real coaching sessions appear
- AI insights are displayed
- Student journeys are visualized
- Coach analytics work properly

## Testing the Platform

### 1. Basic UI Test (Works without Firebase data)
- Navigate between tabs (Overview, Sessions, Journey, Analytics)
- Test search and filters
- Check responsive design
- Verify component rendering

### 2. Full Integration Test (Requires Firebase data)
- Select different coaches
- Search for sessions
- View AI insights
- Explore student journeys
- Check auxiliary documents

## Troubleshooting

### Platform won't start:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

### Firebase connection issues:
1. Check `.env` file has correct credentials
2. Verify Firebase project is active
3. Check browser console for errors
4. Ensure collections have proper permissions

### No data showing:
1. The knowledgeBaseService expects data in specific format
2. Check Firebase collections match the schema
3. Verify at least one recording exists with proper structure

## Next Steps

To populate Firebase with real Knowledge Base data:

1. **Export from Google Sheets** - Get your 316+ recordings data
2. **Transform to match schema** - Ensure all fields align
3. **Batch import to Firebase** - Use Admin SDK or import tools
4. **Verify data integrity** - Check all relationships work

## Features to Explore

Once running, explore these enhanced features:

1. **Coach Overview** - Statistics and expertise areas
2. **Session Search** - Filter by video/transcript/insights availability  
3. **Student Journey** - Timeline, Grid, and Analytics views
4. **AI Insights** - Sentiment, topics, action items, progress
5. **Auxiliary Docs** - Game plans and execution documents
6. **Coach Analytics** - Methodology patterns and success indicators

---

**Note**: The platform is designed to work with the comprehensive Knowledge Base structure. While it will run without full data, the true power comes from having the 316+ enriched coaching sessions properly imported into Firebase.