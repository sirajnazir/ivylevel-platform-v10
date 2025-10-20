import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const FirebaseTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setResult('Testing authentication...\n');
    
    try {
      // Log Firebase config
      const config = {
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        apiKey: auth.app.options.apiKey ? 'Present' : 'Missing'
      };
      
      setResult(prev => prev + `Firebase Config:\n${JSON.stringify(config, null, 2)}\n\n`);
      
      // Try to sign in
      const email = 'admin@ivylevel.com';
      const password = 'AdminIvy2024!';
      
      setResult(prev => prev + `Attempting login with:\nEmail: ${email}\nPassword: ${password}\n\n`);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      setResult(prev => prev + `✅ Success! User: ${userCredential.user.email} (${userCredential.user.uid})`);
    } catch (error) {
      setResult(prev => prev + `❌ Error: ${error.message}\nCode: ${error.code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Firebase Authentication Test</h2>
      <button 
        onClick={testAuth} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#FF4A23',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Test Authentication'}
      </button>
      
      <pre style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {result || 'Click the button to test authentication'}
      </pre>
    </div>
  );
};

export default FirebaseTest;