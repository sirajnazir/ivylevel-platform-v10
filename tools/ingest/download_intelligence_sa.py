#!/usr/bin/env python3
"""
Download intelligence files from Google Drive using service account credentials.
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

# Intelligence folders to download
INTELLIGENCE_FOLDERS = [
    '01-Intelligence-GamePlan',
    '02-Intelligence-ExecutionDocs',
    '03-Intelligence-SessionTranscripts',
    '04-Intelligence-iMessage'
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
        print("Error: credentials.json not found")
        sys.exit(1)
    
    try:
        with open(cred_path, 'r') as f:
            cred_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error reading credentials.json: {e}")
        sys.exit(1)
    
    credentials = service_account.Credentials.from_service_account_info(
        cred_data, scopes=SCOPES)
    
    return build('drive', 'v3', credentials=credentials)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to avoid path issues."""
    # Replace forward slashes and backslashes with underscores
    filename = filename.replace('/', '_').replace('\\', '_')
    
    # Replace other problematic characters
    filename = filename.replace('<', '_').replace('>', '_')
    filename = filename.replace('|', '_').replace(':', '_')
    filename = filename.replace('?', '_').replace('*', '_')
    filename = filename.replace('"', '_')
    
    # Replace multiple spaces with single space
    filename = ' '.join(filename.split())
    
    # Remove trailing dots and spaces
    filename = filename.strip('. ')
    
    # If filename is empty after sanitization, use a default
    if not filename:
        filename = "unnamed_file"
        
    return filename

def list_folders(service, parent_id):
    """List all folders in the parent folder."""
    folders = {}
    
    try:
        # List all items in parent folder
        results = service.files().list(
            q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder'",
            fields="files(id, name)",
            pageSize=100
        ).execute()
        
        items = results.get('files', [])
        
        for item in items:
            folders[item['name']] = item['id']
        
        return folders
        
    except Exception as e:
        print(f"Error listing folders: {e}")
        return {}

def download_file(service, file_id, file_name, output_path):
    """Download a file from Google Drive."""
    try:
        request = service.files().get_media(fileId=file_id)
        file_handle = io.BytesIO()
        downloader = MediaIoBaseDownload(file_handle, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        # Write to file
        file_handle.seek(0)
        with open(output_path, 'wb') as f:
            f.write(file_handle.read())
        
        return True
    except Exception as e:
        print(f"  Error downloading {file_name}: {e}")
        return False

def download_folder_contents(service, folder_id, folder_name, output_dir):
    """Download all files from a folder."""
    os.makedirs(output_dir, exist_ok=True)
    
    downloaded = 0
    page_token = None
    
    while True:
        try:
            # List files in folder
            results = service.files().list(
                q=f"'{folder_id}' in parents and mimeType!='application/vnd.google-apps.folder'",
                fields="nextPageToken, files(id, name, mimeType)",
                pageToken=page_token,
                pageSize=100
            ).execute()
            
            items = results.get('files', [])
            
            for item in items:
                # Skip files starting with "Copy_of"
                if item['name'].startswith('Copy_of'):
                    print(f"  Skipping: {item['name']}")
                    continue
                
                # Sanitize filename
                safe_filename = sanitize_filename(item['name'])
                output_path = os.path.join(output_dir, safe_filename)
                
                # Skip if already exists
                if os.path.exists(output_path):
                    print(f"  Already exists: {safe_filename}")
                    downloaded += 1
                    continue
                
                print(f"  Downloading: {item['name']} -> {safe_filename}")
                
                # Handle Google Docs/Sheets exports
                if item['mimeType'] in ['application/vnd.google-apps.document',
                                       'application/vnd.google-apps.spreadsheet']:
                    # Export as PDF
                    try:
                        request = service.files().export_media(
                            fileId=item['id'],
                            mimeType='application/pdf'
                        )
                        file_handle = io.BytesIO()
                        downloader = MediaIoBaseDownload(file_handle, request)
                        
                        done = False
                        while not done:
                            status, done = downloader.next_chunk()
                        
                        # Add .pdf extension if not present
                        if not output_path.endswith('.pdf'):
                            output_path += '.pdf'
                        
                        file_handle.seek(0)
                        with open(output_path, 'wb') as f:
                            f.write(file_handle.read())
                        
                        downloaded += 1
                    except Exception as e:
                        print(f"    Error exporting: {e}")
                else:
                    # Regular file download
                    if download_file(service, item['id'], item['name'], output_path):
                        downloaded += 1
            
            # Check for more pages
            page_token = results.get('nextPageToken')
            if not page_token:
                break
                
        except Exception as e:
            print(f"Error listing folder contents: {e}")
            break
    
    return downloaded

def main():
    """Main function to download Intelligence files."""
    print("Authenticating with Google Drive...")
    service = authenticate()
    
    print(f"\nListing folders in parent folder: {PARENT_FOLDER_ID}")
    folders = list_folders(service, PARENT_FOLDER_ID)
    
    if not folders:
        print("No folders found!")
        return
    
    print(f"Found {len(folders)} folders")
    
    # Filter for intelligence folders
    intelligence_folders = {name: id for name, id in folders.items() 
                           if name in INTELLIGENCE_FOLDERS}
    
    print(f"\nFound {len(intelligence_folders)} Intelligence folders to download:")
    for name in sorted(intelligence_folders.keys()):
        print(f"  - {name}")
    
    # Download each folder
    total_downloaded = 0
    
    for folder_name in sorted(intelligence_folders.keys()):
        folder_id = intelligence_folders[folder_name]
        output_dir = os.path.join(OUTPUT_BASE, folder_name)
        
        print(f"\nProcessing: {folder_name}")
        print(f"  Output dir: {output_dir}")
        
        count = download_folder_contents(service, folder_id, folder_name, output_dir)
        total_downloaded += count
        
        print(f"  Downloaded {count} files")
        time.sleep(1)  # Be nice to the API
    
    print(f"\n✓ Total files downloaded: {total_downloaded}")
    print(f"✓ Files saved to: {OUTPUT_BASE}")

if __name__ == '__main__':
    main()