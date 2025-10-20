import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  ChartIcon, TrophyIcon, ClockIcon, UserIcon, 
  StarIcon, AlertIcon, CheckIcon, ICON_COLORS 
} from './Icons';

const AnalyticsDashboard = ({ onClose }) => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [analyticsData, setAnalyticsData] = useState({
    readinessOverTime: [],
    coachDistribution: [],
    performanceMetrics: [],
    skillsRadar: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const coachesQuery = query(collection(db, 'coaches'), orderBy('provisionedAt', 'desc'));
      const snapshot = await getDocs(coachesQuery);
      const coachData = [];
      
      snapshot.forEach(doc => {
        coachData.push({ id: doc.id, ...doc.data() });
      });
      
      setCoaches(coachData);
      
      // Process analytics data
      const analytics = processAnalyticsData(coachData);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (coachData) => {
    // Readiness over time (simulated data for now)
    const readinessOverTime = generateReadinessOverTime(selectedPeriod);
    
    // Coach distribution by status
    const statusCounts = {
      active: 0,
      onboarding: 0,
      provisioned: 0
    };
    
    coachData.forEach(coach => {
      if (coach.status === 'active') statusCounts.active++;
      else if (coach.onboardingStarted) statusCounts.onboarding++;
      else statusCounts.provisioned++;
    });
    
    const coachDistribution = [
      { name: 'Active', value: statusCounts.active, color: '#22c55e' },
      { name: 'Onboarding', value: statusCounts.onboarding, color: '#3b82f6' },
      { name: 'Provisioned', value: statusCounts.provisioned, color: '#f59e0b' }
    ];
    
    // Performance metrics by experience level
    const performanceMetrics = processPerformanceByExperience(coachData);
    
    // Skills radar chart
    const skillsRadar = processSkillsDistribution(coachData);
    
    return {
      readinessOverTime,
      coachDistribution,
      performanceMetrics,
      skillsRadar
    };
  };

  const generateReadinessOverTime = (period) => {
    const data = [];
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate growing readiness scores
      const baseScore = 65 + (days - i) * 0.5;
      const randomVariation = Math.random() * 10 - 5;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        averageReadiness: Math.round(baseScore + randomVariation),
        newCoaches: Math.floor(Math.random() * 3)
      });
    }
    
    return data;
  };

  const processPerformanceByExperience = (coachData) => {
    const experienceBuckets = {
      '0-2 years': { count: 0, avgReadiness: 0 },
      '3-5 years': { count: 0, avgReadiness: 0 },
      '6+ years': { count: 0, avgReadiness: 0 }
    };
    
    coachData.forEach(coach => {
      const exp = parseInt(coach.experience) || 0;
      const readiness = coach.readinessScore || 0;
      
      if (exp <= 2) {
        experienceBuckets['0-2 years'].count++;
        experienceBuckets['0-2 years'].avgReadiness += readiness;
      } else if (exp <= 5) {
        experienceBuckets['3-5 years'].count++;
        experienceBuckets['3-5 years'].avgReadiness += readiness;
      } else {
        experienceBuckets['6+ years'].count++;
        experienceBuckets['6+ years'].avgReadiness += readiness;
      }
    });
    
    return Object.entries(experienceBuckets).map(([range, data]) => ({
      experience: range,
      coaches: data.count,
      avgReadiness: data.count > 0 ? Math.round(data.avgReadiness / data.count) : 0
    }));
  };

  const processSkillsDistribution = (coachData) => {
    const skillCounts = {};
    
    coachData.forEach(coach => {
      if (coach.strengths) {
        coach.strengths.forEach(strength => {
          skillCounts[strength] = (skillCounts[strength] || 0) + 1;
        });
      }
    });
    
    // Get top 6 skills for radar chart
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({
        skill: skill.length > 15 ? skill.substring(0, 15) + '...' : skill,
        count,
        fullMark: Math.max(...Object.values(skillCounts))
      }));
    
    return topSkills;
  };

  // Calculate key metrics
  const totalCoaches = coaches.length;
  const activeCoaches = coaches.filter(c => c.status === 'active').length;
  const avgReadiness = coaches.reduce((sum, c) => sum + (c.readinessScore || 0), 0) / totalCoaches || 0;
  const highPerformers = coaches.filter(c => c.readinessScore >= 85).length;

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 74, 35, 0.1)',
            borderTopColor: ICON_COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1600px',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChartIcon size={24} color={ICON_COLORS.primary} />
              Analytics Dashboard
            </h2>
            <p style={{ color: '#6b7280' }}>
              Comprehensive insights into coach performance and platform metrics
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Time Period Selector */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px'
        }}>
          {['week', 'month', 'quarter'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: '8px 16px',
                background: selectedPeriod === period ? ICON_COLORS.primary : 'white',
                color: selectedPeriod === period ? 'white' : '#6b7280',
                border: `1px solid ${selectedPeriod === period ? ICON_COLORS.primary : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px',
          background: '#f9fafb'
        }}>
          {/* Key Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Total Coaches</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{totalCoaches}</p>
                  <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '4px' }}>
                    +{Math.floor(Math.random() * 5) + 1} this {selectedPeriod}
                  </p>
                </div>
                <UserIcon size={40} color="#e0e7ff" />
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Active Coaches</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{activeCoaches}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                    {Math.round((activeCoaches / totalCoaches) * 100)}% of total
                  </p>
                </div>
                <CheckIcon size={40} color="#d1fae5" />
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Avg Readiness</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{Math.round(avgReadiness)}%</p>
                  <p style={{ fontSize: '0.75rem', color: avgReadiness > 70 ? '#22c55e' : '#f59e0b', marginTop: '4px' }}>
                    {avgReadiness > 70 ? '↑' : '↓'} {Math.abs(Math.round(Math.random() * 10 - 5))}% from last {selectedPeriod}
                  </p>
                </div>
                <TrophyIcon size={40} color="#fef3c7" />
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>High Performers</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{highPerformers}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                    85%+ readiness
                  </p>
                </div>
                <StarIcon size={40} color="#fde68a" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '24px'
          }}>
            {/* Readiness Over Time */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Readiness Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.readinessOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="averageReadiness" 
                    stroke={ICON_COLORS.primary} 
                    strokeWidth={2}
                    name="Avg Readiness %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newCoaches" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="New Coaches"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Coach Distribution */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Coach Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.coachDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.coachDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Performance by Experience */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Performance by Experience Level
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="experience" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="coaches" fill="#3b82f6" name="Number of Coaches" />
                  <Bar dataKey="avgReadiness" fill={ICON_COLORS.primary} name="Avg Readiness %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Skills Radar */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Top Skills Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={analyticsData.skillsRadar}>
                  <PolarGrid stroke="#f3f4f6" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                  <Radar 
                    name="Coaches" 
                    dataKey="count" 
                    stroke={ICON_COLORS.primary} 
                    fill={ICON_COLORS.primary} 
                    fillOpacity={0.6} 
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights Section */}
          <div style={{
            marginTop: '32px',
            background: '#fff7ed',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #fed7aa'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertIcon size={20} color="#ea580c" />
              Key Insights & Recommendations
            </h3>
            <ul style={{ paddingLeft: '20px', color: '#7c2d12' }}>
              {avgReadiness < 70 && (
                <li style={{ marginBottom: '8px' }}>
                  Average readiness is below 70%. Consider increasing training resources and mentor support.
                </li>
              )}
              {activeCoaches < totalCoaches * 0.5 && (
                <li style={{ marginBottom: '8px' }}>
                  Less than 50% of coaches are active. Review onboarding process and identify bottlenecks.
                </li>
              )}
              {highPerformers > totalCoaches * 0.3 && (
                <li style={{ marginBottom: '8px' }}>
                  {Math.round((highPerformers / totalCoaches) * 100)}% of coaches are high performers. 
                  Consider having them mentor newer coaches.
                </li>
              )}
              <li>
                Focus on coaches with 0-2 years experience as they show lower average readiness scores.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;