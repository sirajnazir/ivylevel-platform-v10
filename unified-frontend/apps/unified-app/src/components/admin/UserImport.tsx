import React, { useState, useCallback } from 'react';
import { Upload, Users, FileText, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/apiService';

interface ImportResult {
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  errors: Array<{ email: string; error: string }>;
  imported_users: Array<{ email: string; username: string; role: string; password: string }>;
}

export const UserImport: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userType, setUserType] = useState<'student' | 'coach'>('student');
  const [defaultPassword, setDefaultPassword] = useState('Welcome123!');
  const [showPassword, setShowPassword] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_type', userType);
      formData.append('default_password', defaultPassword);

      const response = await apiService.post<ImportResult>('/admin/users/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(response.data);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        total_processed: 0,
        successful_imports: 0,
        failed_imports: 1,
        errors: [{ email: 'unknown', error: 'Failed to import file' }],
        imported_users: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCredentials = () => {
    if (!importResult) return;

    const data = {
      import_date: new Date().toISOString(),
      default_password: defaultPassword,
      imported_users: importResult.imported_users,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ivylevel-imported-users-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const template = userType === 'student' 
      ? 'student_id,name,first_name,last_name,email,grade,program,coach,status\nstudent_001,John Doe,John,Doe,john.doe@example.com,11,Ultimate Prep,Jenny,active'
      : 'coach_id,name,first_name,last_name,email,role,status,expertise,timezone\ncoach_001,Jane Smith,Jane,Smith,jane.smith@example.com,coach,active,SAT Prep,America/Los_Angeles';

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userType}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Import Users</h2>
          <p className="mt-1 text-sm text-gray-600">
            Bulk import students or coaches from CSV files
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="student"
                  checked={userType === 'student'}
                  onChange={(e) => setUserType(e.target.value as 'student')}
                  className="mr-2"
                />
                <span>Students</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="coach"
                  checked={userType === 'coach'}
                  onChange={(e) => setUserType(e.target.value as 'coach')}
                  className="mr-2"
                />
                <span>Coaches</span>
              </label>
            </div>
          </div>

          {/* Default Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Password
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              All imported users will have this password. They should change it on first login.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex-1">
                <div className="flex items-center justify-center px-6 py-8 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-gray-400">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">CSV file up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </label>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Download className="w-4 h-4 inline mr-1" />
                Download Template
              </button>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => {
                setSelectedFile(null);
                setImportResult(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 inline mr-2" />
                  Import Users
                </>
              )}
            </button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{importResult.total_processed}</p>
                    <p className="text-sm text-gray-600">Total Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.successful_imports}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed_imports}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="flex items-center text-sm font-medium text-red-800 mb-2">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Import Errors
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        {error.email}: {error.error}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {importResult.successful_imports > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="flex items-center text-sm font-medium text-green-800 mb-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import Successful
                  </h4>
                  <p className="text-sm text-green-700 mb-2">
                    Successfully imported {importResult.successful_imports} users.
                  </p>
                  <button
                    onClick={downloadCredentials}
                    className="text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Download User Credentials
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Instructions</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>Download the CSV template for the user type you want to import</li>
          <li>Fill in the template with user information</li>
          <li>Required fields: email, first_name, last_name, status (active/inactive)</li>
          <li>Upload the completed CSV file</li>
          <li>All users will be created with the default password</li>
          <li>Download the credentials file after successful import</li>
          <li>Send welcome emails to users with their login information</li>
        </ol>
      </div>
    </div>
  );
};