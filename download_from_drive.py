#!/usr/bin/env python3
"""
Download files from Google Drive using service account credentials
"""
import os
import json
import re
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

# Configuration
CREDENTIALS_PATH = "/Users/snazir/ivylevel-coaching-platform/credentials.json"
ROOT_FOLDER_ID = "1ARWeIUPKGOSnmNCatLMdnPqdbxxTrPUQ"
OUTPUT_DIR = "data/raw/jenny-huda"

# Folder mapping based on file patterns
FOLDER_MAPPING = {
    "GAMEPLAN": "01-Intelligence-GamePlan",
    "EXEC-INTEL": "02-Intelligence-ExecutionDocs", 
    "TRANS-INTEL": "03-Intelligence-SessionTranscripts",
    "IMSG-INTEL": "04-Intelligence-iMessage",
    "APP": "09-Raw-ApplicationDocs"
}

def get_drive_service():
    """Initialize Google Drive API service"""
    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    return build('drive', 'v3', credentials=creds)

def determine_folder(filename):
    """Determine which folder a file should go into based on its name"""
    filename_upper = filename.upper()
    
    # Check each pattern
    for pattern, folder in FOLDER_MAPPING.items():
        if pattern in filename_upper:
            return folder
    
    # Additional patterns
    if "SESSION" in filename_upper or "TRANSCRIPT" in filename_upper:
        return "03-Intelligence-SessionTranscripts"
    elif "MESSAGE" in filename_upper:
        return "04-Intelligence-iMessage"
    elif "APPLICATION" in filename_upper or "APP" in filename_upper:
        return "09-Raw-ApplicationDocs"
    else:
        return "00-Other"

def download_file(service, file_id, file_name, output_path, mime_type=None):
    """Download a file from Google Drive"""
    try:
        # Check if it's a Google Doc/Sheet/Slides
        if mime_type and 'google-apps' in mime_type:
            # Export as appropriate format
            if 'spreadsheet' in mime_type:
                request = service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                output_path = output_path.with_suffix('.xlsx')
            elif 'document' in mime_type:
                request = service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                output_path = output_path.with_suffix('.docx')
            elif 'presentation' in mime_type:
                request = service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation')
                output_path = output_path.with_suffix('.pptx')
            else:
                # For other Google file types, export as PDF
                request = service.files().export_media(fileId=file_id, mimeType='application/pdf')
                output_path = output_path.with_suffix('.pdf')
        else:
            # Regular file download
            request = service.files().get_media(fileId=file_id)
        
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        
        while done is False:
            status, done = downloader.next_chunk()
            if status:
                print(f"Download {int(status.progress() * 100)}%")
        
        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(fh.getvalue())
        print(f"Downloaded: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error downloading {file_name}: {str(e)}")
        return False

def list_files_recursive(service, folder_id, path=""):
    """Recursively list all files in a folder"""
    files = []
    page_token = None
    
    while True:
        try:
            # List files in current folder
            results = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                pageSize=100,
                fields="nextPageToken, files(id, name, mimeType, webViewLink)",
                pageToken=page_token
            ).execute()
            
            items = results.get('files', [])
            
            for item in items:
                item['path'] = path
                files.append(item)
                
                # If it's a folder, recurse into it
                if item['mimeType'] == 'application/vnd.google-apps.folder':
                    subfolder_files = list_files_recursive(service, item['id'], 
                                                         os.path.join(path, item['name']))
                    files.extend(subfolder_files)
            
            page_token = results.get('nextPageToken', None)
            if page_token is None:
                break
                
        except Exception as e:
            print(f"Error listing files in folder {folder_id}: {str(e)}")
            break
    
    return files

def main():
    """Main function to download all files"""
    # Create output directory
    output_base = Path(OUTPUT_DIR)
    output_base.mkdir(parents=True, exist_ok=True)
    
    # Initialize service
    print("Initializing Google Drive service...")
    service = get_drive_service()
    
    # List all files
    print(f"Scanning folder: {ROOT_FOLDER_ID}")
    all_files = list_files_recursive(service, ROOT_FOLDER_ID)
    
    # Filter out folders and process files
    files_to_download = [f for f in all_files if f['mimeType'] != 'application/vnd.google-apps.folder']
    
    print(f"Found {len(files_to_download)} files to download")
    
    # Download each file
    downloaded = 0
    skipped = 0
    
    for file in files_to_download:
        file_name = file['name']
        
        # Skip Copy_of files and *Chat files
        if file_name.startswith('Copy_of') or file_name.startswith('Copy of'):
            print(f"Skipping backup: {file_name}")
            skipped += 1
            continue
            
        # Skip chat files in session transcripts (files ending with *Chat.extension)
        if file_name.endswith('Chat.docx') or file_name.endswith('Chat.pdf') or file_name.endswith('Chat.txt') or file_name.endswith('Chat.json'):
            if determine_folder(file_name) == "03-Intelligence-SessionTranscripts":
                print(f"Skipping chat file: {file_name}")
                skipped += 1
                continue
        
        # Determine output folder
        folder = determine_folder(file_name)
        output_dir = output_base / folder
        
        # Clean filename for filesystem
        safe_filename = re.sub(r'[<>:"/\\|?*]', '_', file_name)
        output_path = output_dir / safe_filename
        
        # Download file
        if download_file(service, file['id'], file_name, output_path, file.get('mimeType')):
            downloaded += 1
            
            # Don't store webViewLink as separate files anymore
    
    print(f"\nDownload complete!")
    print(f"Downloaded: {downloaded} files")
    print(f"Skipped: {skipped} files")
    print(f"Output directory: {output_base}")

if __name__ == "__main__":
    main()