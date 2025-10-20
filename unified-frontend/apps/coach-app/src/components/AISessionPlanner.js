// src/components/AISessionPlanner.js
// AI-powered session planning and automation system

import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Brain,
  Sparkles,
  Target,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Edit3,
  Plus,
  Trash2,
  Copy,
  Send,
  FileText,
  Video,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Zap,
  ArrowRight,
  Mail,
  Bell,
  Timer,
  BarChart3,
  Lightbulb,
  Award
} from 'lucide-react';

const AISessionPlanner = ({ coach, student, weekNumber, previousSessions = [] }) => {
  const [sessionPlan, setSessionPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customizations, setCustomizations] = useState({
    duration: 60,
    focus: 'balanced',
    energyLevel: 'normal'
  });
  const [agendaItems, setAgendaItems] = useState([]);
  const [automations, setAutomations] = useState({
    reminders: true,
    recapEmail: true,
    actionItems: true,
    progressTracking: true
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
    if (student && weekNumber) {
      generateAISessionPlan();
    }
  }, [student, weekNumber]);

  const loadTemplates = () => {
    // Load session templates based on week and student profile
    const templates = [
      {
        id: '168-hour',
        name: '168-Hour Assessment Session',
        description: 'Comprehensive time audit and goal setting',
        week: [1, 2],
        duration: 90,
        structure: [
          { time: 15, activity: 'Warm-up & Energy Check', type: 'connection' },
          { time: 30, activity: '168-Hour Time Audit', type: 'assessment' },
          { time: 20, activity: 'Dream Goals Discussion', type: 'visioning' },
          { time: 15, activity: 'Quick Wins Identification', type: 'planning' },
          { time: 10, activity: 'Action Items & Commitment', type: 'closing' }
        ]
      },
      {
        id: 'weekly-execution',
        name: 'Weekly Execution Session',
        description: 'Regular check-in and progress session',
        week: 'any',
        duration: 60,
        structure: [
          { time: 10, activity: 'Check-in & Wins Celebration', type: 'connection' },
          { time: 15, activity: 'Action Items Review', type: 'accountability' },
          { time: 25, activity: 'Main Focus Work', type: 'execution' },
          { time: 10, activity: 'Next Week Planning', type: 'planning' }
        ]
      },
      {
        id: 'crisis-management',
        name: 'Crisis Management Session',
        description: 'For high-stress situations or urgent issues',
        week: 'any',
        duration: 60,
        structure: [
          { time: 10, activity: 'Situation Assessment', type: 'assessment' },
          { time: 20, activity: 'Problem-Solving Workshop', type: 'execution' },
          { time: 20, activity: 'Action Plan Development', type: 'planning' },
          { time: 10, activity: 'Stress Management Techniques', type: 'support' }
        ]
      }
    ];
    setTemplates(templates);
  };

  const generateAISessionPlan = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // AI analyzes previous sessions, student progress, and current needs
    const analysis = analyzeStudentContext();
    const plan = createOptimalSessionPlan(analysis);
    
    setSessionPlan(plan);
    setAgendaItems(plan.agenda);
    setIsGenerating(false);
  };

  const analyzeStudentContext = () => {
    // AI analysis of student's current state
    return {
      recentProgress: {
        completionRate: 0.85,
        engagementLevel: 'high',
        challengeAreas: ['time-management', 'test-prep'],
        wins: ['completed-research-proposal', 'improved-gpa']
      },
      upcomingEvents: [
        { type: 'exam', subject: 'AP Biology', daysUntil: 14 },
        { type: 'deadline', item: 'Research paper', daysUntil: 7 }
      ],
      emotionalState: 'slightly-stressed',
      recommendedFocus: 'test-preparation',
      energyPattern: 'afternoon-peak'
    };
  };

  const createOptimalSessionPlan = (analysis) => {
    const plan = {
      sessionNumber: previousSessions.length + 1,
      weekNumber: weekNumber,
      date: new Date().toLocaleDateString(),
      duration: customizations.duration,
      primaryFocus: analysis.recommendedFocus,
      objectives: [
        'Address upcoming AP Biology exam preparation',
        'Review research paper progress',
        'Develop stress management strategies',
        'Set clear action items for next week'
      ],
      agenda: [
        {
          id: 1,
          time: 5,
          activity: 'Energy Check & Wins Celebration',
          type: 'connection',
          description: 'Start with positive energy and celebrate research proposal completion',
          resources: [],
          priority: 'high'
        },
        {
          id: 2,
          time: 10,
          activity: 'Action Items Review',
          type: 'accountability',
          description: 'Review last week\'s commitments and progress',
          resources: ['Weekly Execution Doc'],
          priority: 'high'
        },
        {
          id: 3,
          time: 20,
          activity: 'AP Biology Exam Strategy',
          type: 'execution',
          description: 'Create study plan and practice test schedule',
          resources: ['AP Bio Study Guide', 'Practice Test Links'],
          priority: 'critical',
          aiSuggestion: 'Focus on cellular respiration - identified weakness area'
        },
        {
          id: 4,
          time: 15,
          activity: 'Research Paper Review',
          type: 'execution',
          description: 'Review outline and address any blockers',
          resources: ['Research Paper Template'],
          priority: 'high'
        },
        {
          id: 5,
          time: 5,
          activity: 'Stress Management Techniques',
          type: 'support',
          description: 'Teach box breathing and time-blocking',
          resources: ['Stress Management Guide'],
          priority: 'medium'
        },
        {
          id: 6,
          time: 5,
          activity: 'Action Items & Commitment',
          type: 'closing',
          description: 'Set specific, measurable goals for next week',
          resources: ['Action Item Template'],
          priority: 'high'
        }
      ],
      aiInsights: {
        studentMood: 'Slightly stressed about upcoming deadlines',
        recommendedApproach: 'Balance achievement focus with stress relief',
        parentCommunication: 'Highlight progress on research proposal',
        redFlags: 'Watch for signs of burnout - consider lighter session if needed'
      },
      automatedTasks: [
        { type: 'reminder', time: '-24h', message: 'Session tomorrow! Review AP Bio topics' },
        { type: 'reminder', time: '-4h', message: 'Session in 4 hours - prepare questions' },
        { type: 'recap', time: '+1h', template: 'achievement-focused' },
        { type: 'followup', time: '+48h', message: 'Check on AP Bio study progress' }
      ]
    };
    
    return plan;
  };

  const updateAgendaItem = (id, updates) => {
    setAgendaItems(prev => 
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };

  const addAgendaItem = () => {
    const newItem = {
      id: Date.now(),
      time: 10,
      activity: 'New Activity',
      type: 'execution',
      description: '',
      resources: [],
      priority: 'medium'
    };
    setAgendaItems([...agendaItems, newItem]);
  };

  const deleteAgendaItem = (id) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id));
  };

  const applyTemplate = (template) => {
    setSelectedTemplate(template);
    setAgendaItems(template.structure.map((item, idx) => ({
      id: idx + 1,
      ...item,
      resources: [],
      priority: 'medium',
      description: ''
    })));
    setCustomizations(prev => ({ ...prev, duration: template.duration }));
  };

  const AgendaItemCard = ({ item, index }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const typeColors = {
      connection: 'blue',
      accountability: 'yellow',
      execution: 'green',
      planning: 'purple',
      support: 'pink',
      closing: 'gray',
      assessment: 'indigo',
      visioning: 'cyan'
    };
    
    const color = typeColors[item.type] || 'gray';

    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${
        item.priority === 'critical' ? 'ring-2 ring-red-500' : ''
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 bg-${color}-100 text-${color}-600 rounded-lg flex items-center justify-center font-semibold`}>
              {item.time}'
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={item.activity}
                  onChange={(e) => updateAgendaItem(item.id, { activity: e.target.value })}
                  className="w-full font-medium text-gray-900 border-b border-gray-300 focus:border-blue-500 outline-none"
                />
              ) : (
                <h4 className="font-medium text-gray-900">{item.activity}</h4>
              )}
              <span className={`inline-block mt-1 text-xs bg-${color}-100 text-${color}-700 px-2 py-0.5 rounded`}>
                {item.type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteAgendaItem(item.id)}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {(item.description || isEditing) && (
          <div className="mt-3">
            {isEditing ? (
              <textarea
                value={item.description}
                onChange={(e) => updateAgendaItem(item.id, { description: e.target.value })}
                placeholder="Add description..."
                className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 focus:border-blue-500 outline-none"
                rows={2}
              />
            ) : (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
          </div>
        )}
        
        {item.aiSuggestion && (
          <div className="mt-3 p-2 bg-purple-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-700">{item.aiSuggestion}</p>
            </div>
          </div>
        )}
        
        {item.resources && item.resources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.resources.map((resource, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {resource}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">AI is creating your optimal session plan...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing {previousSessions.length} previous sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              AI Session Planner
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </h2>
            <p className="text-purple-100">
              Week {weekNumber} • Session #{previousSessions.length + 1} • {student}
            </p>
          </div>
          <button
            onClick={generateAISessionPlan}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate Plan
          </button>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Session Settings</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={customizations.duration}
              onChange={(e) => setCustomizations({ ...customizations, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Focus Mode</label>
            <select
              value={customizations.focus}
              onChange={(e) => setCustomizations({ ...customizations, focus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="balanced">Balanced</option>
              <option value="academic">Academic Heavy</option>
              <option value="planning">Planning Focus</option>
              <option value="support">Emotional Support</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Energy Level</label>
            <select
              value={customizations.energyLevel}
              onChange={(e) => setCustomizations({ ...customizations, energyLevel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low Energy</option>
              <option value="normal">Normal</option>
              <option value="high">High Energy</option>
            </select>
          </div>
        </div>
        
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Automation Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(automations).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setAutomations({ ...automations, [key]: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Templates */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-medium text-gray-900">{template.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {template.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Week {Array.isArray(template.week) ? template.week.join('-') : template.week}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      {sessionPlan?.aiInsights && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Insights for This Session
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-purple-800 mb-1">Student State</h4>
              <p className="text-sm text-purple-700">{sessionPlan.aiInsights.studentMood}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-800 mb-1">Recommended Approach</h4>
              <p className="text-sm text-purple-700">{sessionPlan.aiInsights.recommendedApproach}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-800 mb-1">Parent Communication</h4>
              <p className="text-sm text-purple-700">{sessionPlan.aiInsights.parentCommunication}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-800 mb-1">Watch For</h4>
              <p className="text-sm text-purple-700">{sessionPlan.aiInsights.redFlags}</p>
            </div>
          </div>
        </div>
      )}

      {/* Session Agenda */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Session Agenda</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Total: {agendaItems.reduce((sum, item) => sum + item.time, 0)} minutes
            </span>
            <button
              onClick={addAgendaItem}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {agendaItems.map((item, index) => (
            <AgendaItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>

      {/* Automated Tasks */}
      {sessionPlan?.automatedTasks && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Automated Tasks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessionPlan.automatedTasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3">
                {task.type === 'reminder' && <Bell className="w-4 h-4 text-blue-600" />}
                {task.type === 'recap' && <Mail className="w-4 h-4 text-green-600" />}
                {task.type === 'followup' && <MessageSquare className="w-4 h-4 text-purple-600" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {task.time} • {task.message || task.template}
                  </p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="flex gap-3">
          <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy Agenda
          </button>
          <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send to Student
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Save Session Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISessionPlanner;