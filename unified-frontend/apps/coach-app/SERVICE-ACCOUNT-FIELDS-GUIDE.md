# Detailed Service Account Creation Guide

## Creating Service Account - Field by Field

### Step 1: Start Creation
1. You're at: APIs & Services → Credentials
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"Service account"**

### Step 2: Service Account Details Screen

You'll see a form with these fields:

#### Field 1: Service account name (Required)
**What to enter**: `IvyLevel Drive Access`
- This is just a friendly name
- You can use any name you want
- This helps you remember what it's for

#### Field 2: Service account ID (Auto-filled)
**What happens**: It auto-fills to something like: `ivylevel-drive-access`
- This becomes part of the email address
- Just leave it as-is (it auto-generates from the name)
- It will show the full email below like: `ivylevel-drive-access@your-project-id.iam.gserviceaccount.com`

#### Field 3: Service account description (Optional)
**What to enter**: `Accesses Google Drive to index coaching resources`
- This is optional but helpful
- Just describes what this account does
- You can leave it blank if you want

**Click**: The blue **"CREATE AND CONTINUE"** button

### Step 3: Grant Access to Project Screen (Optional)

You'll see:
- "Grant this service account access to project"
- A dropdown that says "Select a role"

**What to do**: Just click **"CONTINUE"** without selecting anything
- We don't need project-level permissions
- We only need Drive API access
- Skip this entire step

### Step 4: Grant Users Access Screen (Optional)

You'll see:
- "Grant users access to this service account"
- Fields for email addresses

**What to do**: Just click **"DONE"** without entering anything
- We don't need to grant access to other users
- Skip this entire step too

### Step 5: You're Back at Credentials Page

Now you'll see your service account listed. It will show:
- An email like: `ivylevel-drive-access@your-project-id.iam.gserviceaccount.com`
- Type: Service account
- Key: 0 keys

### Step 6: Create the JSON Key

1. **Click on the email address** (the service account you just created)
2. You'll see tabs: DETAILS, KEYS, PERMISSIONS, etc.
3. **Click on "KEYS" tab**
4. **Click "ADD KEY"** button
5. Select **"Create new key"**
6. A popup appears asking for key type
7. Select **"JSON"** (should be selected by default)
8. **Click "CREATE"**

### Step 7: Save the File

- Your browser downloads a JSON file
- Original name will be like: `your-project-name-abc123def456.json`
- **Rename it to**: `service-account.json`
- **Move it to**: `/Users/snazir/ivylevel-coach-training/credentials/service-account.json`

## Summary of What You Entered:

| Field | What You Entered |
|-------|-----------------|
| Service account name | `IvyLevel Drive Access` |
| Service account ID | (auto-generated, like `ivylevel-drive-access`) |
| Service account description | `Accesses Google Drive to index coaching resources` (optional) |
| Role | Nothing - skipped this step |
| User access | Nothing - skipped this step |
| Key type | JSON |

## Important Email to Copy

After creating, you'll have a service account email that looks like:
```
ivylevel-drive-access@your-project-123456.iam.gserviceaccount.com
```

**Copy this email!** You need it to share your Google Drive folder.

## Common Mistakes to Avoid:

1. **Don't select any roles** in Step 3 - just click Continue
2. **Don't add any users** in Step 4 - just click Done  
3. **Don't forget to download the JSON key** - it won't let you download it again
4. **Don't lose the service account email** - you need it for Drive sharing

## What the Downloaded File Looks Like:

The `service-account.json` file will look similar to this:
```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "some-long-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nVERY-LONG-KEY-HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "ivylevel-drive-access@your-project-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Next Step: Share Your Drive Folder

1. Go to Google Drive
2. Right-click your resources folder
3. Click "Share"
4. Paste the `client_email` from the JSON file (the one ending in `.iam.gserviceaccount.com`)
5. Set to "Viewer"
6. Uncheck "Notify people"
7. Click "Share"

That's it! You've successfully created your service account.