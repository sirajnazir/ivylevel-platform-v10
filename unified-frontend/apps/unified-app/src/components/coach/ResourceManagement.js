// ResourceManagement.js - Enhanced resource provisioning for admin portal
import React, { useState, useEffect } from 'react';
import { Search, Filter, FolderOpen, Video, FileText, Users, Share2, ChevronDown, ChevronUp, Tag, Calendar, BookOpen, Target, Clock, CheckCircle } from 'lucide-react';

const ResourceManagement = ({ coaches, onResourceShare }) => {
  const [resources, setResources] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedResources, setSelectedResources] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    grade: 'all',
    subject: 'all',
    studentProfile: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [resourceTemplates, setResourceTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock resource data structure
  const mockResources = [
    {
      id: 'res1',
      name: 'Marissa & Iqra - BioMed Training Session',
      type: 'video',
      url: 'https://drive.google.com/...',
      grade: 'sophomore',
      subject: 'biomed',
      studentProfile: 'average',
      tags: ['168-hour', 'first-session', 'biomed-aspirant'],
      duration: '90 min',
      dateAdded: '2024-05-15',
      viewCount: 45,
      rating: 4.8
    },
    {
      id: 'res2',
      name: "Iqra's Game Plan Report - BioMed Aspirant",
      type: 'document',
      url: 'https://drive.google.com/...',
      grade: 'sophomore',
      subject: 'biomed',
      studentProfile: 'average',
      tags: ['game-plan', 'assessment', 'weak-spots'],
      dateAdded: '2024-05-10',
      viewCount: 23,
      rating: 4.9
    },
    {
      id: 'res3',
      name: 'Andrew & Aarnav - CS/Business Session',
      type: 'video',
      url: 'https://drive.google.com/...',
      grade: 'junior',
      subject: 'cs-business',
      studentProfile: 'high-achieving',
      tags: ['168-hour', 'dual-interest', 'technical'],
      duration: '85 min',
      dateAdded: '2024-06-20',
      viewCount: 38,
      rating: 4.7
    },
    {
      id: 'res4',
      name: 'Weekly Execution Template - STEM Students',
      type: 'template',
      url: 'https://drive.google.com/...',
      grade: 'all',
      subject: 'stem',
      studentProfile: 'all',
      tags: ['execution-doc', 'template', 'planning'],
      dateAdded: '2024-04-01',
      viewCount: 156,
      rating: 4.9
    }
  ];

  useEffect(() => {
    // Initialize with mock data
    setResources(mockResources);
    
    // Load resource templates
    const templates = [
      {
        id: 'temp1',
        name: 'Sophomore BioMed Starter Pack',
        description: 'Complete resource bundle for coaches working with sophomore biomedical aspirants',
        resources: ['res1', 'res2', 'res4'],
        tags: ['sophomore', 'biomed', 'starter']
      },
      {
        id: 'temp2',
        name: 'Junior CS/Business Bundle',
        description: 'Essential resources for upperclassmen with technical and business interests',
        resources: ['res3', 'res4'],
        tags: ['junior', 'cs', 'business']
      }
    ];
    setResourceTemplates(templates);
  }, []);

  // AI-powered resource recommendations
  const getRecommendations = (coach) => {
    if (!coach.assignedStudents || coach.assignedStudents.length === 0) return [];
    
    const student = coach.assignedStudents[0]; // For demo, using first student
    
    return resources.filter(resource => {
      const gradeMatch = resource.grade === 'all' || resource.grade === student.grade;
      const subjectMatch = resource.subject === 'all' || resource.subject === student.interests;
      const profileMatch = resource.studentProfile === 'all' || resource.studentProfile === student.profile;
      
      return gradeMatch && subjectMatch && profileMatch;
    }).slice(0, 5);
  };

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.includes(searchQuery.toLowerCase()));
    
    const matchesType = filters.type === 'all' || resource.type === filters.type;
    const matchesGrade = filters.grade === 'all' || resource.grade === filters.grade;
    const matchesSubject = filters.subject === 'all' || resource.subject === filters.subject;
    const matchesProfile = filters.studentProfile === 'all' || resource.studentProfile === filters.studentProfile;
    
    return matchesSearch && matchesType && matchesGrade && matchesSubject && matchesProfile;
  });

  // Handle resource selection
  const toggleResourceSelection = (resourceId) => {
    setSelectedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  // Apply template
  const applyTemplate = (template) => {
    setSelectedResources(template.resources);
  };

  // Share resources with coach
  const shareResources = async () => {
    if (!selectedCoach || selectedResources.length === 0) return;
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const sharedResources = resources.filter(r => selectedResources.includes(r.id));
      
      // Call parent function to update coach data
      onResourceShare(selectedCoach.id, sharedResources);
      
      // Reset selections
      setSelectedResources([]);
      setSelectedCoach(null);
      setLoading(false);
      
      alert(`Successfully shared ${sharedResources.length} resources with ${selectedCoach.name}`);
    }, 1000);
  };

  // Resource type icon
  const getResourceIcon = (type) => {
    switch(type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'template': return <BookOpen className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Resource Management & Provisioning
      </h2>

      {/* Coach Selection */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
          Select Coach to Provision Resources
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
          {coaches.map(coach => (
            <div
              key={coach.id}
              onClick={() => setSelectedCoach(coach)}
              style={{
                padding: '15px',
                border: selectedCoach?.id === coach.id ? '2px solid #FF4A23' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedCoach?.id === coach.id ? '#FFF5F3' : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: '600' }}>{coach.name}</div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                {coach.assignedStudents?.length || 0} students assigned
              </div>
              {coach.assignedStudents?.map((student, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                  • {student.name} ({student.grade}, {student.interests})
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      {selectedCoach && (
        <div style={{ 
          backgroundColor: '#F0FDF4', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #86EFAC'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target className="w-5 h-5 text-green-600" />
              AI-Powered Recommendations for {selectedCoach.name}
            </h3>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              style={{ cursor: 'pointer' }}
            >
              {showRecommendations ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          
          {showRecommendations && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {getRecommendations(selectedCoach).map(resource => (
                <div
                  key={resource.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getResourceIcon(resource.type)}
                    <div>
                      <div style={{ fontWeight: '500' }}>{resource.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {resource.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleResourceSelection(resource.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: selectedResources.includes(resource.id) ? '#FF4A23' : '#f3f4f6',
                      color: selectedResources.includes(resource.id) ? 'white' : '#374151',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedResources.includes(resource.id) ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resource Templates */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
          Quick Templates
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {resourceTemplates.map(template => (
            <div
              key={template.id}
              style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
            >
              <h4 style={{ fontWeight: '600', marginBottom: '5px' }}>{template.name}</h4>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                {template.description}
              </p>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {template.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => applyTemplate(template)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF4A23',
                  color: 'white',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Apply Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '10px', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search resources by name or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Types</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="template">Templates</option>
          </select>
          
          <select
            value={filters.grade}
            onChange={(e) => setFilters({...filters, grade: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Grades</option>
            <option value="freshman">Freshman</option>
            <option value="sophomore">Sophomore</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>
          
          <select
            value={filters.subject}
            onChange={(e) => setFilters({...filters, subject: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Subjects</option>
            <option value="biomed">BioMed</option>
            <option value="cs-business">CS/Business</option>
            <option value="stem">STEM</option>
            <option value="humanities">Humanities</option>
          </select>
          
          <select
            value={filters.studentProfile}
            onChange={(e) => setFilters({...filters, studentProfile: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Profiles</option>
            <option value="high-achieving">High Achieving</option>
            <option value="average">Average</option>
            <option value="struggling">Struggling</option>
          </select>
        </div>
      </div>

      {/* Resource Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredResources.map(resource => (
          <div
            key={resource.id}
            style={{
              padding: '20px',
              border: selectedResources.includes(resource.id) ? '2px solid #FF4A23' : '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: selectedResources.includes(resource.id) ? '#FFF5F3' : 'white',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getResourceIcon(resource.type)}
                <h4 style={{ fontWeight: '600', fontSize: '16px' }}>{resource.name}</h4>
              </div>
              <button
                onClick={() => toggleResourceSelection(resource.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedResources.includes(resource.id) ? '#FF4A23' : '#f3f4f6',
                  color: selectedResources.includes(resource.id) ? 'white' : '#374151',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {selectedResources.includes(resource.id) ? <CheckCircle className="w-4 h-4" /> : 'Select'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {resource.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users className="w-4 h-4" />
                Grade: {resource.grade}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <BookOpen className="w-4 h-4" />
                Subject: {resource.subject}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar className="w-4 h-4" />
                Added: {new Date(resource.dateAdded).toLocaleDateString()}
              </div>
              {resource.duration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock className="w-4 h-4" />
                  Duration: {resource.duration}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {resource.viewCount} views • ⭐ {resource.rating}/5
              </div>
              <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#FF4A23',
                  textDecoration: 'none'
                }}
              >
                Preview →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      {selectedResources.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: '600' }}>
            {selectedResources.length} resources selected
          </div>
          <button
            onClick={shareResources}
            disabled={!selectedCoach || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedCoach ? '#FF4A23' : '#e5e7eb',
              color: selectedCoach ? 'white' : '#9ca3af',
              borderRadius: '6px',
              border: 'none',
              cursor: selectedCoach ? 'pointer' : 'not-allowed',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <Share2 className="w-4 h-4" />
            {loading ? 'Sharing...' : `Share with ${selectedCoach?.name || 'Select a coach'}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;