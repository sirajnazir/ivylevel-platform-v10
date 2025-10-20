# Debugging the Enhanced Platform

## Current Status

The Enhanced Smart Coach Onboarding platform has been updated to:

1. **Use `indexed_videos` collection** instead of `recordings` (which doesn't exist yet)
2. **Map existing video data** to the Knowledge Base schema
3. **Support Google Drive video playback** with proper embed URLs
4. **Handle various URL formats** from your existing data

## What's Been Fixed:

### 1. Data Loading
- Changed from `recordings` collection to `indexed_videos` 
- Updated field mapping to handle your existing data structure:
  - `title` → `topic`
  - `coach`/`coachName` → `coach` 
  - `student`/`studentName` → `student`
  - `url`/`videoUrl`/`driveId` → video URL

### 2. Video Player
- Created `GoogleDriveVideoPlayer` component
- Converts various Google Drive URL formats to embed URLs
- Handles:
  - `/file/d/FILE_ID/view` format
  - `/open?id=FILE_ID` format  
  - `/uc?id=FILE_ID` format
  - Direct embed URLs

### 3. Collection Mapping
The service now maps your existing Firebase structure to the KB schema:

```javascript
// Your indexed_videos structure
{
  title: "Session Title",
  coach: "Jenny",
  student: "Arshiya", 
  url: "drive.google.com/...",
  driveId: "abc123",
  duration: 60
}

// Mapped to KB structure
{
  topic: "Session Title",
  coach: "Jenny",
  student: "Arshiya",
  hasVideo: true,
  videoUrl: "drive.google.com/...",
  duration: 60
}
```

## To Check Your Data:

1. **Open Browser Console** (F12)
2. Look for logs starting with:
   - "Attempting to fetch coaches..."
   - "Found X coaches in database"
   - "Loading recordings..."

3. **Check Network Tab**
   - Look for Firestore requests
   - See what collections are being queried

## Common Issues:

### No Videos Showing
- Check if `indexed_videos` has data
- Verify `url`, `videoUrl`, or `driveId` fields exist
- Check console for permission errors

### Videos Not Playing
- Ensure Google Drive sharing is set to "Anyone with link"
- Check if embed URLs are being generated correctly
- Look for CORS or embedding restrictions

### No Coach Data
- The platform expects coaches in newCoachesData.js
- Currently using: Kelvin, Jamie, Noor
- These need to match names in your indexed_videos

## Quick Fixes to Try:

### 1. Check Your Firebase Data
```javascript
// In browser console at http://localhost:3003
const checkData = async () => {
  const { db } = await import('./firebase');
  const { collection, getDocs } = await import('firebase/firestore');
  
  // Check indexed_videos
  const videos = await getDocs(collection(db, 'indexed_videos'));
  console.log('Videos:', videos.size);
  videos.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  
  // Check coaches
  const coaches = await getDocs(collection(db, 'coaches'));
  console.log('Coaches:', coaches.size);
};
checkData();
```

### 2. Test Video URL Conversion
```javascript
// Test if video URLs are working
const testVideo = {
  url: "YOUR_GOOGLE_DRIVE_URL_HERE"
};
console.log('Embed URL:', convertToEmbedUrl(testVideo.url));
```

## Next Steps:

1. **Verify Firebase Data** - Make sure indexed_videos has the expected fields
2. **Check Permissions** - Ensure Firestore rules allow reading
3. **Map Coach Names** - Update newCoachesData.js to match your actual coaches
4. **Import Real KB Data** - When ready, import the 316+ recordings with proper schema

The platform is now configured to work with your existing data structure while supporting the full Knowledge Base schema when you're ready to migrate!