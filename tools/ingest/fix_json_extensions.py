#!/usr/bin/env python3
"""
Fix JSON files that have .pdf extension appended
"""
import os
import shutil

# Base directory
BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'raw', 'jenny-huda')

# Intelligence folders
INTELLIGENCE_FOLDERS = [
    '01-Intelligence-GamePlan',
    '02-Intelligence-ExecutionDocs',
    '03-Intelligence-SessionTranscripts',
    '04-Intelligence-iMessage'
]

def fix_extensions():
    """Remove .pdf extension from .json.pdf files"""
    fixed_count = 0
    
    for folder in INTELLIGENCE_FOLDERS:
        folder_path = os.path.join(BASE_DIR, folder)
        if not os.path.exists(folder_path):
            print(f"Folder not found: {folder_path}")
            continue
        
        print(f"\nProcessing: {folder}")
        
        # Find all .json.pdf files
        for filename in os.listdir(folder_path):
            if filename.endswith('.json.pdf'):
                old_path = os.path.join(folder_path, filename)
                new_filename = filename[:-4]  # Remove .pdf
                new_path = os.path.join(folder_path, new_filename)
                
                # Rename file
                print(f"  Renaming: {filename} -> {new_filename}")
                shutil.move(old_path, new_path)
                fixed_count += 1
    
    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    fix_extensions()