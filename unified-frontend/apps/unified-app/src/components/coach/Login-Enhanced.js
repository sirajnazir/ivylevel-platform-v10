// src/components/Login-Enhanced.js
// Enhanced login component with demo accounts

import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Brain, Sparkles, Lock, Mail, ArrowRight, Users, Shield, Zap } from 'lucide-react';

const LoginEnhanced = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const demoAccounts = [
    {
      role: 'Admin',
      email: 'admin@ivylevel.com',
      password: 'password123',
      description: 'Full system access with AI analytics',
      icon: Shield,
      color: 'purple'
    },
    {
      role: 'Coach',
      email: 'demo@ivymentors.co',
      password: 'password123',
      description: 'AI-powered coaching features',
      icon: Brain,
      color: 'blue'
    },
    {
      role: 'New Coach',
      email: 'newcoach@ivymentors.co',
      password: 'password123',
      description: 'Onboarding experience',
      icon: Users,
      color: 'green'
    }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      
      // For demo purposes, create a mock successful login for specific emails
      if (email.endsWith('@ivymentors.co') || email === 'admin@ivylevel.com') {
        // In a real app, this would be handled by Firebase Auth
        // For demo, we'll show an error but you can implement mock auth
        setError('Demo mode: Use the provided demo accounts or implement Firebase Auth');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError('Failed to sign in with Google');
    }
  };

  const useDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setShowDemo(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">AI Coach Pro</h1>
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600">Intelligent coaching powered by AI</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome Back</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="mt-4 w-full py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        </div>

        {/* Demo Accounts */}
        {showDemo && (
          <div className="mt-8 bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Demo Accounts
              </h3>
              <button
                onClick={() => setShowDemo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    onClick={() => useDemoAccount(account)}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-${account.color}-100 text-${account.color}-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{account.role}</div>
                        <div className="text-sm text-gray-600">{account.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {account.email} / {account.password}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Features Preview */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">AI-Powered Features:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1 bg-white rounded-full shadow-sm">Real-time Coaching</span>
            <span className="px-3 py-1 bg-white rounded-full shadow-sm">Smart Resources</span>
            <span className="px-3 py-1 bg-white rounded-full shadow-sm">Session Planning</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginEnhanced;