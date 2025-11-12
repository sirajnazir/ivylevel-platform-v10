import React, { useState, useEffect } from 'react';

const Profile = ({ setProfile, setScore, setTasks, setChatHistory }) => {
  const [formData, setFormData] = useState({
    gpa: 3.8,
    apCourses: 11,
    leadershipRoles: 2,
    impactfulProjects: 2,
    awards: 0,
    interests: 'Computer Science, Film'
  });
  const [assessmentStage, setAssessmentStage] = useState(0);

  const calculateScore = (data) => {
    const academics = Math.min(10, (data.gpa / 4 * 5) + (data.apCourses / 10 * 5));
    const leadership = Math.min(10, data.leadershipRoles * 3.5);
    const impact = Math.min(10, data.impactfulProjects * 3);
    const awards = Math.min(10, 2 + data.awards * 4);
    const personalStory = Math.min(10, data.interests.split(',').length * 3);
    return Math.round((academics + leadership + impact + awards + personalStory) / 5 * 10);
  };

  const generateTasks = () => [
    { title: 'Take SAT (Goal: 1550)', deadline: '2023-10-15', completed: false },
    { title: 'Submit Congressional App Challenge', deadline: '2023-11-01', completed: false },
    { title: 'Apply for NCWIT Award', deadline: '2023-12-01', completed: false },
    { title: 'Complete Folklift Video Series', deadline: '2023-12-31', completed: false }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setAssessmentStage(1); // Start AI assessment
  };

  useEffect(() => {
    if (assessmentStage === 1) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'Academic Analyst', text: 'Analyzing Huda’s GPA (3.8) and 11 AP courses—strong academic rigor detected.' },
        { sender: 'Narrative Analyst', text: 'Noting interests in CS and Film—a unique storyteller profile emerging.' }
      ]);
      setTimeout(() => setAssessmentStage(2), 2000);
    } else if (assessmentStage === 2) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'Achievements Agent', text: 'No major awards yet—this is a key gap. Suggesting competitions.' },
        { sender: 'Narrative Analyst', text: 'Handing off to Achievements Agent for award strategy.' }
      ]);
      setTimeout(() => setAssessmentStage(3), 2000);
    } else if (assessmentStage === 3) {
      const newScore = calculateScore(formData);
      setProfile(formData);
      setScore(newScore);
      setTasks(generateTasks());
      setChatHistory(prev => [
        ...prev,
        { sender: 'Jenny', text: 'Huda, your dual passions are a strength! No awards yet, but we’ll build that together—exciting opportunities ahead.' },
        { sender: 'Jenny', text: `Your Ivy+ Ready Score is ${newScore}. Let’s move to the Game Plan!’` }
      ]);
      setAssessmentStage(0);
    }
  }, [assessmentStage]);

  return (
    <div className="container">
      <h2>Decode: Profile Assessment</h2>
      <form onSubmit={handleSubmit}>
        <label>GPA: <input type="number" step="0.1" value={formData.gpa} onChange={(e) => setFormData({ ...formData, gpa: e.target.value })} /></label><br />
        <label>AP Courses: <input type="number" value={formData.apCourses} onChange={(e) => setFormData({ ...formData, apCourses: e.target.value })} /></label><br />
        <label>Leadership Roles: <input type="number" value={formData.leadershipRoles} onChange={(e) => setFormData({ ...formData, leadershipRoles: e.target.value })} /></label><br />
        <label>Impactful Projects: <input type="number" value={formData.impactfulProjects} onChange={(e) => setFormData({ ...formData, impactfulProjects: e.target.value })} /></label><br />
        <label>Awards: <input type="number" value={formData.awards} onChange={(e) => setFormData({ ...formData, awards: e.target.value })} /></label><br />
        <label>Interests: <input type="text" value={formData.interests} onChange={(e) => setFormData({ ...formData, interests: e.target.value })} /></label><br />
        <button type="submit" disabled={assessmentStage > 0}>Submit Profile</button>
      </form>
      <div className="chat">
        <h3>Assessment Chat</h3>
        {assessmentStage > 0 && <p>Processing your profile...</p>}
      </div>
    </div>
  );
};

export default Profile;