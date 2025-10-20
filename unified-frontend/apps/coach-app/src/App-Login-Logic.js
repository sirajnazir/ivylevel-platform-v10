// src/App.js
import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Your Firebase config from .env.local
const firebaseConfig = {
  apiKey:               process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:           process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:            process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:        process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:                process.env.REACT_APP_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function App() {
  const [ivyId, setIvyId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!ivyId || !accessCode || !agreed) {
      setError('Fill all fields and agree to the terms.');
      return;
    }
    try {
      const email = ivyId.includes('@') ? ivyId : `${ivyId}@ivymentors.co`;
      await signInWithEmailAndPassword(auth, email, accessCode);
      setLoggedIn(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loggedIn) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>✅ You’re in!</h1>
        <p>Now you can render your Baseline v2.0 app here.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
      padding: 20
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: 360
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Coach Login</h2>
        {error && (
          <div style={{ marginBottom: 12, color: '#c00' }}>{error}</div>
        )}
        <label style={{ display: 'block', marginBottom: 8 }}>
          Coach ID
          <input
            type="text"
            value={ivyId}
            onChange={e => setIvyId(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
            autoFocus
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Access Code
          <input
            type="password"
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
          />
          <span style={{ marginLeft: 8, fontSize: 14 }}>
            I agree to complete mandatory training.
          </span>
        </label>
        <button
          type="submit"
          disabled={!agreed}
          style={{
            width: '100%',
            padding: 12,
            background: agreed ? '#2563eb' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: agreed ? 'pointer' : 'not-allowed'
          }}
        >
          Access Portal
        </button>
      </form>
    </div>
  );
}