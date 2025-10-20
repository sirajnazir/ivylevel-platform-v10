# Create Firestore Database

The error "5 NOT_FOUND" means Firestore hasn't been created in your project yet. Let's fix this!

## Step-by-Step Guide

### 1. Go to Firebase Console
Open: https://console.firebase.google.com/project/ivylevel-coach-train-auth/firestore

### 2. Create Database
You'll see a screen that says "Cloud Firestore" with a button:
- Click **"Create database"**

### 3. Choose Security Rules
You'll see two options:
- ✅ Select **"Start in production mode"**
- Click **"Next"**

### 4. Choose Location
Select your Firestore location:
- For US users: Choose **"nam5 (United States)"**
- For other regions: Choose your nearest location
- Click **"Enable"**

### 5. Wait for Creation
- Firestore will take about 30-60 seconds to create
- You'll see a loading screen
- When done, you'll see an empty database

## After Database is Created

Wait about 1 minute, then run:

```bash
# Try the initialization again
npm run init:firestore
```

You should see:
```
✓ Created collection: users
✓ Created collection: students
✓ Created collection: resources
... etc
```

Then run:
```bash
# Create test data
npm run init:testdata
```

## Alternative Method (If the link doesn't work)

1. Go to: https://console.firebase.google.com
2. Click on your project: "ivylevel-coach-train-auth"
3. In the left sidebar, look for "Firestore Database"
4. Click on it
5. Click "Create database"
6. Follow steps 3-5 above

## Verify It's Working

After creating the database, go to:
https://console.firebase.google.com/project/ivylevel-coach-train-auth/firestore/data

You should see:
- An empty database interface
- A message like "Start a collection"

This means Firestore is ready!