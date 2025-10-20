// src/components/AICoachingAssistant.js
// AI-powered coaching assistant that provides real-time guidance and personalization

import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Target, 
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Loader,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';

const AICoachingAssistant = ({ coach, student, sessionContext, onInsightGenerated }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    engagement: 85,
    clarity: 92,
    progress: 78,
    momentum: 88
  });
  
  const recognitionRef = useRef(null);
  const analysisIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition for real-time session analysis
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror = handleSpeechError;
    }

    // Start real-time analysis
    analysisIntervalRef.current = setInterval(analyzeSessionDynamics, 5000);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  const handleSpeechResult = (event) => {
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;
    setTranscript(prev => prev + ' ' + transcript);
    
    // Trigger AI analysis on key phrases
    if (transcript.includes('struggling') || transcript.includes('confused') || transcript.includes('help')) {
      generateContextualSupport('challenge_detected', transcript);
    }
  };

  const handleSpeechError = (error) => {
    console.error('Speech recognition error:', error);
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const analyzeSessionDynamics = async () => {
    // Simulate AI analysis of session dynamics
    const newMetrics = {
      engagement: Math.min(100, realtimeMetrics.engagement + (Math.random() - 0.5) * 10),
      clarity: Math.min(100, realtimeMetrics.clarity + (Math.random() - 0.5) * 8),
      progress: Math.min(100, realtimeMetrics.progress + (Math.random() - 0.3) * 5),
      momentum: Math.min(100, realtimeMetrics.momentum + (Math.random() - 0.4) * 12)
    };
    
    setRealtimeMetrics(newMetrics);

    // Generate alerts for low metrics
    if (newMetrics.engagement < 70) {
      generateContextualSupport('low_engagement', null);
    }
    if (newMetrics.momentum < 60) {
      generateContextualSupport('low_momentum', null);
    }
  };

  const generateContextualSupport = async (triggerType, context) => {
    setIsAnalyzing(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const contextualInsights = {
      challenge_detected: {
        type: 'intervention',
        priority: 'high',
        title: 'Student Challenge Detected',
        suggestion: `Consider breaking down the concept into smaller steps. Try using the "${student}'s" favorite analogy from their profile.`,
        actions: [
          'Switch to visual explanation',
          'Provide a simpler example',
          'Check understanding with quick quiz'
        ]
      },
      low_engagement: {
        type: 'engagement',
        priority: 'medium',
        title: 'Engagement Dropping',
        suggestion: 'Try switching to a more interactive activity or relating the topic to their interests in gaming/sports.',
        actions: [
          'Ask an open-ended question',
          'Share a relevant success story',
          'Take a 2-minute energizer break'
        ]
      },
      low_momentum: {
        type: 'pacing',
        priority: 'medium',
        title: 'Session Momentum Alert',
        suggestion: 'Consider adjusting the pace. The student might benefit from a quick win or accomplishment.',
        actions: [
          'Set a micro-goal for next 5 minutes',
          'Celebrate recent progress',
          'Switch to easier task temporarily'
        ]
      }
    };

    const insight = contextualInsights[triggerType];
    if (insight) {
      const newInsight = {
        id: Date.now(),
        ...insight,
        timestamp: new Date().toLocaleTimeString()
      };
      setInsights(prev => [newInsight, ...prev.slice(0, 4)]);
      
      if (onInsightGenerated) {
        onInsightGenerated(newInsight);
      }
    }
    
    setIsAnalyzing(false);
  };

  const generateSessionSuggestion = async (type) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const suggestionTemplates = {
      'opening': [
        `Start with celebrating ${student}'s recent achievement in ${sessionContext?.recentAchievement || 'last week\'s goals'}`,
        `Quick energy check: "On a scale of 1-10, how's your energy today?"`,
        `Review last session's top 3 action items before diving in`
      ],
      'middle': [
        `Try the Pomodoro technique: 25 min focused work, 5 min break`,
        `Switch to collaborative problem-solving on their ${sessionContext?.currentChallenge || 'essay outline'}`,
        `Use the "teach-back" method - have ${student} explain the concept`
      ],
      'closing': [
        `Summarize 3 key wins from today's session`,
        `Set specific, measurable goals for next session`,
        `End with motivation: "What are you most excited to work on this week?"`
      ]
    };
    
    const suggestions = suggestionTemplates[type] || [];
    setSuggestions(suggestions);
    setIsAnalyzing(false);
  };

  const MetricGauge = ({ label, value, icon: Icon, color }) => {
    const getColorClass = () => {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${getColorClass()}`} />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">{label}</span>
            <span className={`text-xs font-medium ${getColorClass()}`}>{value}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                value >= 80 ? 'bg-green-600' : value >= 60 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">AI Coaching Assistant</h3>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Listening to session...
          </div>
        )}
      </div>

      {/* Real-time Metrics */}
      <div className="p-4 bg-gray-50 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Session Dynamics</span>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <MetricGauge label="Engagement" value={realtimeMetrics.engagement} icon={MessageSquare} />
        <MetricGauge label="Clarity" value={realtimeMetrics.clarity} icon={Lightbulb} />
        <MetricGauge label="Progress" value={realtimeMetrics.progress} icon={TrendingUp} />
        <MetricGauge label="Momentum" value={realtimeMetrics.momentum} icon={Clock} />
      </div>

      {/* AI Insights */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Live AI Insights</span>
          {isAnalyzing && (
            <Loader className="w-4 h-4 text-purple-600 animate-spin" />
          )}
        </div>

        {insights.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">AI insights will appear here during your session</p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map(insight => (
              <div
                key={insight.id}
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  insight.priority === 'high' 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-yellow-200 bg-yellow-50'
                }`}
                onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    insight.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                      <span className="text-xs text-gray-500">{insight.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{insight.suggestion}</p>
                    
                    {expandedInsight === insight.id && insight.actions && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700">Quick Actions:</p>
                        {insight.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700"
                          >
                            <ChevronDown className="w-3 h-3 rotate-270" />
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Session Suggestions</span>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>
        
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => generateSessionSuggestion('opening')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
          >
            Opening
          </button>
          <button
            onClick={() => generateSessionSuggestion('middle')}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
          >
            Mid-Session
          </button>
          <button
            onClick={() => generateSessionSuggestion('closing')}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
          >
            Closing
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <Sparkles className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Prompt Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask AI for help..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                generateContextualSupport('manual_query', e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICoachingAssistant;