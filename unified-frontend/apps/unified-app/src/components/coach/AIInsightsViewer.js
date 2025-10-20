import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  Target,
  MessageSquare,
  ListChecks,
  Heart,
  Zap,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Users,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Activity
} from 'lucide-react';

const AIInsightsViewer = ({ insights, recording }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['summary', 'keyTopics']));

  if (!insights) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No AI insights available for this recording</p>
      </div>
    );
  }

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSentimentColor = (score) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (score) => {
    if (score >= 0.7) return 'Positive';
    if (score >= 0.4) return 'Neutral';
    return 'Needs Attention';
  };

  const renderInsightSection = (title, icon, content, sectionKey) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* AI Summary */}
      {insights.aiSummary && renderInsightSection(
        'AI Summary',
        <Brain className="w-5 h-5 text-purple-600" />,
        <p className="text-gray-700">{insights.aiSummary}</p>,
        'summary'
      )}

      {/* Key Topics */}
      {insights.keyTopics && renderInsightSection(
        'Key Topics Discussed',
        <MessageSquare className="w-5 h-5 text-blue-600" />,
        <div className="flex flex-wrap gap-2">
          {insights.keyTopics.map((topic, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {topic}
            </span>
          ))}
        </div>,
        'keyTopics'
      )}

      {/* Action Items */}
      {insights.actionItems && insights.actionItems.length > 0 && renderInsightSection(
        'Action Items',
        <ListChecks className="w-5 h-5 text-green-600" />,
        <ul className="space-y-2">
          {insights.actionItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span className="text-gray-700 text-sm">{item}</span>
            </li>
          ))}
        </ul>,
        'actionItems'
      )}

      {/* Sentiment Analysis */}
      {insights.sentiment && renderInsightSection(
        'Sentiment Analysis',
        <Heart className="w-5 h-5 text-pink-600" />,
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Overall Sentiment</span>
            <span className={`font-medium ${getSentimentColor(insights.sentiment.overall || 0.5)}`}>
              {getSentimentLabel(insights.sentiment.overall || 0.5)}
            </span>
          </div>
          {insights.sentiment.breakdown && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">
                    Positive: {Math.round((insights.sentiment.breakdown.positive || 0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">
                    Neutral: {Math.round((insights.sentiment.breakdown.neutral || 0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-600">
                    Negative: {Math.round((insights.sentiment.breakdown.negative || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>,
        'sentiment'
      )}

      {/* Engagement Metrics */}
      {insights.engagement && renderInsightSection(
        'Engagement Analysis',
        <Zap className="w-5 h-5 text-yellow-600" />,
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {insights.engagement.participationRate ? 
                `${Math.round(insights.engagement.participationRate * 100)}%` : 
                'N/A'
              }
            </div>
            <div className="text-sm text-gray-600">Participation Rate</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {insights.engagement.interactionCount || 0}
            </div>
            <div className="text-sm text-gray-600">Interactions</div>
          </div>
        </div>,
        'engagement'
      )}

      {/* Coaching Insights */}
      {insights.coachingInsights && renderInsightSection(
        'Coaching Analysis',
        <Users className="w-5 h-5 text-indigo-600" />,
        <div className="space-y-3">
          {insights.coachingInsights.effectiveness && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Effectiveness Score</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${insights.coachingInsights.effectiveness * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(insights.coachingInsights.effectiveness * 100)}%
                </span>
              </div>
            </div>
          )}
          {insights.coachingInsights.strategies && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Key Strategies Used</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {insights.coachingInsights.strategies.map((strategy, idx) => (
                  <li key={idx}>{strategy}</li>
                ))}
              </ul>
            </div>
          )}
        </div>,
        'coaching'
      )}

      {/* Challenges & Solutions */}
      {insights.challenges && insights.challenges.length > 0 && renderInsightSection(
        'Challenges Identified',
        <AlertTriangle className="w-5 h-5 text-orange-600" />,
        <div className="space-y-3">
          {insights.challenges.map((challenge, idx) => (
            <div key={idx} className="border-l-4 border-orange-400 pl-3">
              <p className="text-sm font-medium text-gray-700">{challenge.issue}</p>
              {challenge.solution && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Suggested approach:</span> {challenge.solution}
                </p>
              )}
            </div>
          ))}
        </div>,
        'challenges'
      )}

      {/* Progress Indicators */}
      {insights.progressIndicators && renderInsightSection(
        'Progress Indicators',
        <TrendingUp className="w-5 h-5 text-green-600" />,
        <div className="space-y-2">
          {insights.progressIndicators.map((indicator, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-700">{indicator}</span>
            </div>
          ))}
        </div>,
        'progress'
      )}

      {/* Key Insights */}
      {insights.keyInsights && renderInsightSection(
        'Key Insights',
        <Lightbulb className="w-5 h-5 text-yellow-500" />,
        <div className="space-y-2">
          {insights.keyInsights.map((insight, idx) => (
            <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">{insight}</p>
            </div>
          ))}
        </div>,
        'insights'
      )}

      {/* Quality Metrics */}
      {insights.qualityMetrics && renderInsightSection(
        'Session Quality Metrics',
        <BarChart3 className="w-5 h-5 text-purple-600" />,
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(insights.qualityMetrics).map(([metric, value]) => (
            <div key={metric} className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {typeof value === 'number' ? Math.round(value * 100) : value}
                {typeof value === 'number' && '%'}
              </div>
              <div className="text-xs text-gray-600 capitalize">
                {metric.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>,
        'quality'
      )}

      {/* Metadata */}
      {insights.metadata && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Generated: {new Date(insights.metadata.generatedAt || Date.now()).toLocaleString()}
            </span>
            {insights.metadata.model && (
              <span>Model: {insights.metadata.model}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsViewer;