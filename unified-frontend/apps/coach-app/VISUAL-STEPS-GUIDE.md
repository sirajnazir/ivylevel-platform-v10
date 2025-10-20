# Visual Guide - Creating Google Service Account

## Screen 1: Create Credentials
```
+--------------------------------------------------+
| APIs & Services > Credentials                     |
|                                                  |
| + CREATE CREDENTIALS ▼                           |
|   ├─ API key                                    |
|   ├─ OAuth client ID                            |
|   └─ Service account ← CLICK THIS               |
+--------------------------------------------------+
```

## Screen 2: Service Account Details
```
+--------------------------------------------------+
| Create service account                           |
|                                                  |
| 1 Service account details                        |
|                                                  |
| Service account name *                           |
| [IvyLevel Drive Access                    ]      |
|                                                  |
| Service account ID *                             |
| [ivylevel-drive-access                   ] ← AUTO-FILLS
|                                                  |
| This will create an email:                       |
| ivylevel-drive-access@project.iam.gserviceaccount.com
|                                                  |
| Service account description (optional)           |
| [Accesses Google Drive to index coaching  ]      |
| [resources                                ]      |
|                                                  |
| [CREATE AND CONTINUE] ← CLICK THIS               |
+--------------------------------------------------+
```

## Screen 3: Grant Access (SKIP THIS!)
```
+--------------------------------------------------+
| Create service account                           |
|                                                  |
| 2 Grant this service account access to project   |
|   (optional)                                     |
|                                                  |
| Select a role                                    |
| [Select a role ▼] ← DON'T SELECT ANYTHING       |
|                                                  |
| + ADD ANOTHER ROLE                               |
|                                                  |
| [CONTINUE] ← JUST CLICK THIS                     |
+--------------------------------------------------+
```

## Screen 4: Grant Users Access (SKIP THIS TOO!)
```
+--------------------------------------------------+
| Create service account                           |
|                                                  |
| 3 Grant users access to this service account     |
|   (optional)                                     |
|                                                  |
| Service account users role                       |
| [                                        ] ← LEAVE EMPTY
|                                                  |
| Service account admins role                      |
| [                                        ] ← LEAVE EMPTY
|                                                  |
| [DONE] ← JUST CLICK THIS                         |
+--------------------------------------------------+
```

## Screen 5: Back at Credentials List
```
+--------------------------------------------------+
| Service Accounts                                 |
|                                                  |
| Email                                    Type    |
| ivylevel-drive-access@project.iam...    Service |
|         ↑ CLICK ON THIS EMAIL                    |
+--------------------------------------------------+
```

## Screen 6: Service Account Details - Keys Tab
```
+--------------------------------------------------+
| ivylevel-drive-access@project.iam...            |
|                                                  |
| [DETAILS] [KEYS] [PERMISSIONS] [LOGS]            |
|            ↑ CLICK THIS TAB                      |
|                                                  |
| Keys                                             |
| This service account has 0 keys                  |
|                                                  |
| [ADD KEY ▼] ← CLICK THIS                         |
|   ├─ Create new key ← THEN CLICK THIS           |
|   └─ Upload existing key                         |
+--------------------------------------------------+
```

## Screen 7: Create Key Popup
```
+--------------------------------------------------+
| Create private key for "ivylevel-drive-access"   |
|                                                  |
| Key type                                         |
| ○ JSON ← SELECT THIS (usually default)           |
| ○ P12                                            |
|                                                  |
| [CANCEL] [CREATE] ← CLICK CREATE                 |
+--------------------------------------------------+
```

## Screen 8: Key Downloads
```
+--------------------------------------------------+
| Private key saved to your computer               |
|                                                  |
| project-name-abc123.json                         |
|         ↓                                        |
| Downloads folder                                 |
|                                                  |
| ⚠️ RENAME TO: service-account.json               |
| 📁 MOVE TO: credentials/service-account.json     |
+--------------------------------------------------+
```

## What You Just Created:

✅ **Service Account Name**: IvyLevel Drive Access  
✅ **Service Account Email**: ivylevel-drive-access@your-project.iam.gserviceaccount.com  
✅ **JSON Key File**: credentials/service-account.json  

## Don't Forget: Share Your Drive Folder!

```
+--------------------------------------------------+
| Google Drive - Share Folder                      |
|                                                  |
| Share "Coach Resources" with others              |
|                                                  |
| Add people and groups                            |
| [ivylevel-drive-access@project.iam... ] ← PASTE |
|                                                  |
| ● Viewer ▼                                       |
| ☐ Notify people ← UNCHECK THIS                  |
|                                                  |
| [Cancel] [Share] ← CLICK SHARE                   |
+--------------------------------------------------+
```

That's all! No other fields to fill.