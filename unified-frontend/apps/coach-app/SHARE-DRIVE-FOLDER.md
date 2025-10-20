# Share Google Drive Folder with Service Account

## The Issue
Your service account (`ivylevel-drive-access@ivylevel-coaching-sessions.iam.gserviceaccount.com`) doesn't have access to the Google Drive folder.

## Quick Fix Steps

### 1. Find Your IvyLevel Resources Folder
- Go to: https://drive.google.com
- Locate your folder with coach training resources (videos, documents, etc.)
- It might be named something like:
  - "IvyLevel Resources"
  - "Coach Training Materials"
  - "Coaching Sessions"
  - Or similar

### 2. Get the Correct Folder ID
- Open the folder
- Look at the URL in your browser
- It will look like: `https://drive.google.com/drive/folders/XXXXXXXXXXXXX`
- Copy the ID part (the XXXXXXXXXXXXX after /folders/)

### 3. Share the Folder
- Right-click on the folder
- Click "Share"
- In the "Add people and groups" field, paste:
  ```
  ivylevel-drive-access@ivylevel-coaching-sessions.iam.gserviceaccount.com
  ```
- Make sure it's set to **"Viewer"**
- **IMPORTANT**: Uncheck "Notify people" (service accounts can't receive emails)
- Click "Share"

### 4. Update Your Environment File
- Open `/Users/snazir/ivylevel-coach-training/.env.local`
- Update the folder ID:
  ```
  GOOGLE_DRIVE_ROOT_FOLDER_ID=YOUR_NEW_FOLDER_ID_HERE
  ```

### 5. Test Access Again
```bash
node scripts/checkDriveAccess.js
```

You should now see:
- ✅ Folder accessed successfully!
- List of files and folders inside

### 6. Index Your Resources
Once access is confirmed:
```bash
node scripts/indexGoogleDrive.js
```

## What Folder Should I Share?

Share the main folder that contains:
- 📹 Training session videos (like Marissa & Iqra sessions)
- 📄 Game plan documents
- 📋 Execution templates
- 📚 Coach training materials
- 🎯 Student success stories

The script will automatically scan all subfolders and organize resources by:
- Coach names (Kelvin, Noor, Jamie)
- Student types (biomed, CS, business)
- Resource types (videos, documents, templates)

## Alternative: Create a Test Folder

If you want to test first:
1. Create a new folder in Google Drive called "IvyLevel Test Resources"
2. Add a few sample files
3. Share it with the service account
4. Use that folder ID for testing

Let me know which folder you want to use and I'll help you set it up!