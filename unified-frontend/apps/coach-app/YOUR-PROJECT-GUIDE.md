# Your Specific Project Guide

## Your Firebase Project Info:
- **Project ID**: `ivylevel-coach-train-auth`
- **Project URL**: https://console.firebase.google.com/project/ivylevel-coach-train-auth

## Step 1: Get Firebase Admin Credentials

1. **Go directly to your project's service accounts**:
   - Click this link: https://console.firebase.google.com/project/ivylevel-coach-train-auth/settings/serviceaccounts/adminsdk
   - OR manually: Firebase Console → Your project → ⚙️ Settings → Service accounts

2. **Generate the key**:
   - You'll see "Firebase Admin SDK" section
   - Click the button **"Generate new private key"**
   - Confirm by clicking **"Generate key"**
   - Save the downloaded file

3. **Place the file**:
   - The downloaded file will be named something like: `ivylevel-coach-train-auth-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`
   - Rename it to: `firebase-admin.json`
   - Move it to: `/Users/snazir/ivylevel-coach-training/credentials/firebase-admin.json`

## Step 2: Get Google Drive Credentials

### Quick Method (If you already have a Google Cloud Project):
1. Go to: https://console.cloud.google.com
2. Check if you see "ivylevel-coach-train-auth" in the project dropdown
3. If yes, skip to "Enable Google Drive API" below

### Full Method (Create new Google Cloud Project):
1. **Go to**: https://console.cloud.google.com
2. **Create Project**:
   - Click the project dropdown (top of page)
   - Click "NEW PROJECT"
   - Name: "IvyLevel Coach Platform" (or any name)
   - Click "CREATE"

3. **Enable Google Drive API**:
   - Go to: APIs & Services → Library
   - Search: "Google Drive API"
   - Click on it and hit "ENABLE"

4. **Create Service Account**:
   - Go to: APIs & Services → Credentials
   - Click: "+ CREATE CREDENTIALS" → "Service account"
   - Name: "IvyLevel Drive Access"
   - Click through: CREATE AND CONTINUE → CONTINUE → DONE

5. **Download Key**:
   - Click on your new service account (the email)
   - Go to "KEYS" tab
   - ADD KEY → Create new key → JSON → CREATE
   - Save as: `service-account.json`
   - Put in: `/Users/snazir/ivylevel-coach-training/credentials/service-account.json`

6. **Important - Copy the service account email**:
   - It looks like: `ivylevel-drive-access@your-project-id.iam.gserviceaccount.com`
   - You need this for the next step!

## Step 3: Share Your Google Drive Folder

1. **In Google Drive**:
   - Go to your coaching resources folder
   - Right-click → Share
   - Paste the service account email from Step 2
   - Set to "Viewer"
   - Uncheck "Notify people"
   - Click "Share"

2. **Get Folder ID**:
   - Open the folder
   - URL looks like: `https://drive.google.com/drive/folders/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg`
   - The ID is: `1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg` (the part after /folders/)
   
3. **Update .env.local**:
   - Your folder ID is already in there! No need to change it.

## Quick Test

After you've added both files to `/credentials/`, run:

```bash
# This should show all green checkmarks
npm run test:integration
```

If you see:
- ✅ Firebase connection successful
- ✅ Google Drive API initialized

Then run:
```bash
# This will set up your database
npm run setup
```

## Need Help?

If you get stuck at any step:
1. Make sure you're logged into the right Google account
2. For Firebase: You should see "ivylevel-coach-train-auth" as your project
3. For Google Cloud: You can use any project name (doesn't have to match Firebase)

The most common issue is forgetting to share the Google Drive folder with the service account email!