import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedView, setSelectedView] = useState(null);

  if (selectedView) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => setSelectedView(null)}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Demo Selector
          </button>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-4">{selectedView} Dashboard</h2>
            <p className="text-gray-600 mb-4">
              This is where the full {selectedView} interface would load.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-blue-800">
                {selectedView === 'Admin' && '🎯 Features: Coach management, analytics, resource provisioning, AI insights'}
                {selectedView === 'AI Coach' && '🎙️ Features: Voice AI assistant, real-time session monitoring, smart recommendations'}
                {selectedView === 'Onboarding' && '📚 Features: YouTube-style videos, personalized learning paths, progress tracking'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <span className="text-6xl">🧠</span>
            AI Coach Pro
            <span className="text-4xl">✨</span>
          </h1>
          <p className="text-xl text-gray-600">Choose a role to explore AI-powered coaching features!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setSelectedView('Admin')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Admin Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Manage coaches, create onboarding packages, view platform analytics
            </p>
            <div className="text-sm text-purple-600 font-medium">
              Explore Admin Features →
            </div>
          </button>

          <button
            onClick={() => setSelectedView('AI Coach')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Coach Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Experience real-time AI assistance, smart planning, and automated workflows
            </p>
            <div className="text-sm text-blue-600 font-medium">
              See AI Features →
            </div>
          </button>

          <button
            onClick={() => setSelectedView('Onboarding')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Coach Onboarding</h3>
            <p className="text-gray-600 mb-4">
              YouTube-style training with personalized learning paths
            </p>
            <div className="text-sm text-green-600 font-medium">
              Start Training →
            </div>
          </button>
        </div>

        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4">🚀 AI Features You'll Experience:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span>Voice AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span>Smart Resources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span>AI Planning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎥</span>
              <span>Video Training</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span>Automation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <span>Predictive Insights</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <span>Success Patterns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;