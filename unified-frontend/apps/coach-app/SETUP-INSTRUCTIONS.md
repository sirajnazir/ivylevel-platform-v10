# Setup Instructions for Smart Coach Platform

## Prerequisites

Before running the initialization scripts, you need to set up authentication credentials for Firebase Admin SDK and Google Drive API.

## Step 1: Firebase Admin SDK Setup

1. **Go to Firebase Console**
   - Navigate to [Firebase Console](https://console.firebase.google.com)
   - Select your project

2. **Generate Service Account Key**
   - Go to Project Settings (gear icon)
   - Click on "Service Accounts" tab
   - Click "Generate New Private Key"
   - Save the downloaded JSON file as: `credentials/firebase-admin.json`

3. **Verify the file structure**
   ```
   credentials/
   └── firebase-admin.json
   ```

## Step 2: Google Drive API Setup (Optional)

If you want to use the Google Drive integration:

1. **Go to Google Cloud Console**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project

2. **Enable Google Drive API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Fill in the details and create
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key" > JSON
   - Save as: `credentials/service-account.json`

4. **Share Google Drive Folder**
   - Find the service account email (looks like: name@project.iam.gserviceaccount.com)
   - Share your Google Drive folder with this email address (view-only access)

## Step 3: Environment Variables

Ensure your `.env.local` file has all required variables:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google Drive (optional)
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./credentials/service-account.json

# SendGrid (optional)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
REACT_APP_EMAIL_PROVIDER=console  # Use 'sendgrid' for production

# App Settings
REACT_APP_DOMAIN=http://localhost:3000
REACT_APP_APP_NAME=IvyLevel Coach Training
```

## Step 4: Run Setup Scripts

Once credentials are in place:

```bash
# Install dependencies
npm install

# Initialize Firestore collections
npm run init:firestore

# Create test data
npm run init:testdata

# Or run both at once
npm run setup

# Test the integration
npm run test:integration
```

## Troubleshooting

### Error: "Unable to detect a Project Id"
- Make sure `firebase-admin.json` exists in the `credentials/` directory
- Verify the file contains a valid `project_id` field

### Error: "Permission denied"
- Check that Firestore is enabled in Firebase Console
- Verify your service account has the necessary permissions

### Google Drive not working
- Ensure the service account email has access to your Google Drive folder
- Verify the folder ID in `.env.local` is correct

## Running Without Admin SDK

If you just want to test the frontend without Firebase Admin SDK:

1. The app will work with client-side Firebase SDK
2. You won't be able to run the initialization scripts
3. You'll need to manually create test data through the UI

## Security Notes

- Never commit credential files to version control
- The `.gitignore` is already configured to exclude credential files
- Keep your service account keys secure and rotate them periodically

## Next Steps

After successful setup:

1. Start the development server: `npm start`
2. Login as admin: `admin@ivylevel.com`
3. Create coaches and students through the UI
4. Test resource sharing and email generation features

For more details, see [README-ENHANCEMENTS.md](./README-ENHANCEMENTS.md)