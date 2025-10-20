// scripts/checkDriveAccess.js
// Diagnostic script to check Google Drive access

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { google } = require('googleapis');

async function checkAccess() {
  console.log('🔍 Checking Google Drive Access...\n');
  
  try {
    // Load service account
    const keyFile = path.join(__dirname, '../credentials/service-account.json');
    const serviceAccount = require(keyFile);
    
    console.log('📧 Service Account Email:', serviceAccount.client_email);
    console.log('📁 Root Folder ID:', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg');
    
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    // Try to get folder metadata
    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg';
    
    console.log('\n🔍 Attempting to access folder...');
    
    try {
      const folder = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, webViewLink'
      });
      
      console.log('✅ Folder accessed successfully!');
      console.log('  Name:', folder.data.name);
      console.log('  Type:', folder.data.mimeType);
      console.log('  Link:', folder.data.webViewLink);
      
      // Try to list contents
      console.log('\n📂 Checking folder contents...');
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 10
      });
      
      if (response.data.files && response.data.files.length > 0) {
        console.log(`✅ Found ${response.data.files.length} items:`);
        response.data.files.forEach(file => {
          console.log(`  - ${file.name} (${file.mimeType})`);
        });
      } else {
        console.log('⚠️  Folder appears to be empty');
      }
      
    } catch (error) {
      console.error('❌ Cannot access folder:', error.message);
      
      if (error.code === 404) {
        console.log('\n🔍 Possible issues:');
        console.log('1. The folder ID might be incorrect');
        console.log('2. The folder might have been deleted or moved');
      } else if (error.code === 403) {
        console.log('\n🔍 Permission issue detected!');
        console.log('Please ensure you have:');
        console.log('1. Shared the folder with:', serviceAccount.client_email);
        console.log('2. Given at least "Viewer" permission');
        console.log('3. The folder is not in trash');
      }
    }
    
    // Test with a different approach - list all accessible files
    console.log('\n🔍 Listing all accessible files...');
    try {
      const allFiles = await drive.files.list({
        q: 'trashed = false',
        fields: 'files(id, name, mimeType, parents)',
        pageSize: 20
      });
      
      if (allFiles.data.files && allFiles.data.files.length > 0) {
        console.log(`\n✅ Service account has access to ${allFiles.data.files.length} files/folders:`);
        allFiles.data.files.forEach(file => {
          console.log(`  - ${file.name} (${file.mimeType})`);
          if (file.parents) {
            console.log(`    Parent: ${file.parents.join(', ')}`);
          }
        });
      } else {
        console.log('⚠️  No files accessible to service account');
      }
    } catch (error) {
      console.error('❌ Cannot list files:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

// Run diagnostic
checkAccess().catch(console.error);