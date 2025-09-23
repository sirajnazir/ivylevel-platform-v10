#!/usr/bin/env python3
"""
Download raw files from Google Drive using service account credentials.
"""
import os
import sys
import json
import time
from typing import List, Dict, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

# Scopes required for Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Parent folder ID from the provided link
PARENT_FOLDER_ID = '1ARWeIUPKGOSnmNCatLMdnPqdbxxTrPUQ'

# Expected folder structure
EXPECTED_FOLDERS = [
    '01-Raw-GamePlan',
    '02-Raw-ExecutionDocs',
    '03-Raw-SessionTranscripts',
    '04-Raw-iMessages',
    '05-Raw-Emails',
    '06-Raw-AdditionalReports',
    '07-Raw-ChatTranscripts',
    '08-Raw-Essays',
    '09-Raw-ApplicationDocs',
    '10-Master-Correlation'
]

# Base output directory
OUTPUT_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'raw', 'jenny-huda')

def authenticate():
    """Authenticate using service account credentials."""
    cred_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials.json'),
        'credentials.json',
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                     'data', 'intelligence', 'jenny-huda', 'credentials.json')
    ]
    
    cred_path = None
    for path in cred_paths:
        if os.path.exists(path):
            print(f"Found credentials at: {path}")
            cred_path = path
            break
    
    if not cred_path:
        print("Could not find credentials.json")
        sys.exit(1)
    
    # Load service account credentials
    credentials = service_account.Credentials.from_service_account_file(
        cred_path, scopes=SCOPES)
    
    return build('drive', 'v3', credentials=credentials)

def list_folders(service, parent_id: str) -> Dict[str, str]:
    """List all folders in the parent directory."""
    folders = {}
    try:
        results = service.files().list(
            q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id, name)",
            pageSize=100,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        
        items = results.get('files', [])
        for item in items:
            folders[item['name']] = item['id']
        
        return folders
    except Exception as e:
        print(f"Error listing folders: {e}")
        return {}

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to avoid path issues."""
    # Replace path separators with underscores
    filename = filename.replace('/', '_').replace('\\', '_')
    
    # Replace other problematic characters
    filename = filename.replace('<', '_').replace('>', '_')
    filename = filename.replace('|', '_').replace(':', '_')
    filename = filename.replace('?', '_').replace('*', '_')
    filename = filename.replace('"', '_')
    
    # Replace multiple spaces with single space
    filename = ' '.join(filename.split())
    
    # Trim leading/trailing spaces and dots
    filename = filename.strip('. ')
    
    # Ensure filename is not empty
    if not filename:
        filename = "unnamed_file"
    
    return filename

def download_file(service, file_id: str, file_path: str):
    """Download a file from Google Drive."""
    try:
        # Get file metadata
        file_metadata = service.files().get(
            fileId=file_id, 
            fields='mimeType,name',
            supportsAllDrives=True
        ).execute()
        mime_type = file_metadata.get('mimeType', '')
        original_name = file_metadata.get('name', '')
        
        # Sanitize the filename
        safe_filename = sanitize_filename(original_name)
        
        # If the sanitized name is different, update the file path
        if safe_filename != os.path.basename(file_path):
            dir_path = os.path.dirname(file_path)
            file_path = os.path.join(dir_path, safe_filename)
        
        # Handle Google Workspace files
        if mime_type.startswith('application/vnd.google-apps'):
            export_mime_type = None
            extension = None
            
            if 'document' in mime_type:
                export_mime_type = 'application/pdf'
                extension = '.pdf'
            elif 'spreadsheet' in mime_type:
                export_mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                extension = '.xlsx'
            elif 'presentation' in mime_type:
                export_mime_type = 'application/pdf'
                extension = '.pdf'
            else:
                print(f"Skipping unsupported Google file type: {mime_type}")
                return False
            
            # Adjust file path with correct extension
            if extension and not file_path.endswith(extension):
                base = os.path.splitext(file_path)[0]
                file_path = base + extension
            
            request = service.files().export_media(fileId=file_id, mimeType=export_mime_type)
        else:
            # Regular file download
            request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        
        # Create parent directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Download the file
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        
        while not done:
            status, done = downloader.next_chunk()
            if status and status.progress():
                print(f"Download {int(status.progress() * 100)}%", end='\r')
        
        print("")  # New line after progress
        
        # Write to file
        fh.seek(0)
        with open(file_path, 'wb') as f:
            f.write(fh.read())
        
        return True
        
    except Exception as e:
        print(f"Error downloading file: {e}")
        return False

def download_folder_contents(service, folder_id: str, folder_name: str, local_path: str, processed_files: set):
    """Recursively download all contents of a folder."""
    os.makedirs(local_path, exist_ok=True)
    
    page_token = None
    files_downloaded = 0
    
    while True:
        try:
            # List all files in the folder
            results = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id, name, mimeType)",
                pageSize=100,
                pageToken=page_token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            items = results.get('files', [])
            
            for item in items:
                file_id = item['id']
                file_name = item['name']
                mime_type = item.get('mimeType', '')
                
                # Skip if already processed
                if file_id in processed_files:
                    print(f"Skipping already downloaded: {file_name}")
                    continue
                
                # Sanitize filename to avoid path issues
                safe_filename = sanitize_filename(file_name)
                local_file_path = os.path.join(local_path, safe_filename)
                
                # If it's a folder, download recursively
                if mime_type == 'application/vnd.google-apps.folder':
                    print(f"\nEntering subfolder: {file_name}")
                    sub_count = download_folder_contents(service, file_id, file_name, local_file_path, processed_files)
                    files_downloaded += sub_count
                else:
                    # Download the file
                    print(f"Downloading [{folder_name}]: {file_name}")
                    if download_file(service, file_id, local_file_path):
                        files_downloaded += 1
                        processed_files.add(file_id)
                        
                        # Save progress every 10 files
                        if files_downloaded % 10 == 0:
                            with open('download_progress_raw.json', 'w') as f:
                                json.dump(list(processed_files), f)
            
            page_token = results.get('nextPageToken')
            if not page_token:
                break
                
        except Exception as e:
            print(f"Error processing folder {folder_name}: {e}")
            break
    
    return files_downloaded

def main():
    print("=== Google Drive Raw Files Downloader (Service Account) ===")
    
    # Load previous progress if exists
    processed_files = set()
    if os.path.exists('download_progress_raw.json'):
        with open('download_progress_raw.json', 'r') as f:
            processed_files = set(json.load(f))
        print(f"Resuming download. Already processed {len(processed_files)} files.")
    
    # Authenticate
    print("\nAuthenticating with Google Drive...")
    try:
        service = authenticate()
        print("Authentication successful!")
    except Exception as e:
        print(f"Authentication failed: {e}")
        return
    
    # Create base output directory
    os.makedirs(OUTPUT_BASE, exist_ok=True)
    
    # List folders in parent
    print(f"\nListing folders in parent folder ID: {PARENT_FOLDER_ID}")
    folders = list_folders(service, PARENT_FOLDER_ID)
    
    if not folders:
        print("No folders found! This might be due to:")
        print("1. The folder is not shared with the service account")
        print("2. The service account doesn't have read permissions")
        print(f"3. The folder ID is incorrect: {PARENT_FOLDER_ID}")
        print("\nTo fix this, share the folder with the service account email from credentials.json")
        return
    
    print(f"\nFound {len(folders)} folders:")
    for name in sorted(folders.keys()):
        print(f"  - {name}")
    
    # Download each expected folder
    total_downloaded = 0
    for folder_name in EXPECTED_FOLDERS:
        if folder_name in folders:
            folder_id = folders[folder_name]
            local_folder_path = os.path.join(OUTPUT_BASE, folder_name)
            
            print(f"\n{'='*50}")
            print(f"Processing folder: {folder_name}")
            print(f"Local path: {local_folder_path}")
            
            count = download_folder_contents(service, folder_id, folder_name, local_folder_path, processed_files)
            total_downloaded += count
            print(f"Downloaded {count} files from {folder_name}")
            
            # Save progress after each folder
            with open('download_progress_raw.json', 'w') as f:
                json.dump(list(processed_files), f)
        else:
            print(f"\nWARNING: Expected folder '{folder_name}' not found in Google Drive")
    
    print(f"\n{'='*50}")
    print(f"Download complete! Total files downloaded: {total_downloaded}")
    print(f"Files saved to: {OUTPUT_BASE}")
    
    # Clean up progress file
    if os.path.exists('download_progress_raw.json'):
        os.remove('download_progress_raw.json')

if __name__ == "__main__":
    main()