#!/usr/bin/env python3
"""
Rename .json files back to .pdf if they are actually PDFs
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

def rename_to_pdf():
    """Rename .json files that are actually PDFs back to .pdf"""
    renamed_count = 0
    
    for folder in INTELLIGENCE_FOLDERS:
        folder_path = os.path.join(BASE_DIR, folder)
        if not os.path.exists(folder_path):
            print(f"Folder not found: {folder_path}")
            continue
        
        print(f"\nProcessing: {folder}")
        
        # Find all .json files
        for filename in os.listdir(folder_path):
            if filename.endswith('.json'):
                file_path = os.path.join(folder_path, filename)
                
                # Check if it's actually a PDF
                with open(file_path, 'rb') as f:
                    header = f.read(4)
                    if header == b'%PDF':
                        # It's a PDF, rename it
                        new_filename = filename[:-5] + '.pdf'  # Remove .json, add .pdf
                        new_path = os.path.join(folder_path, new_filename)
                        
                        print(f"  Renaming: {filename} -> {new_filename}")
                        shutil.move(file_path, new_path)
                        renamed_count += 1
    
    print(f"\n✓ Renamed {renamed_count} files")

if __name__ == '__main__':
    rename_to_pdf()