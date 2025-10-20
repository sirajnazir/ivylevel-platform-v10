import React, { useEffect } from 'react';

const GamePlan = ({ profile, tasks, setTasks, setChatHistory, chatHistory }) => {
  useEffect(() => {
    if (profile && tasks.length > 0 && !chatHistory.some(msg => msg.sender === 'Awards Agent')) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'Awards Agent', text: 'Proposing Congressional App Challenge and NCWIT Award to address Huda’s awards gap.' },
        { sender: 'Academic Agent', text: 'Adding SAT prep for a 1550+ score by October—critical for Ivy readiness.' },
        { sender: 'Passion Project Agent', text: 'Suggesting Folklift video series completion by December to showcase creativity.' },
        { sender: 'Awards Agent', text: 'Handing off to Academic Agent—SAT timing conflicts with App Challenge. Debating priorities.' },
        { sender: 'Academic Agent', text: 'Resolved: Prioritize SAT for October, stagger App Challenge to November.' },
        { sender: 'Jenny', text: 'Looks good! Huda, this plan balances your goals—let’s tweak for your school’s club politics too.' }
      ]);
      setTasks(tasks.map(task => ({
        ...task,
        resources: task.title.includes('Congressional') ? 'https://www.congressionalappchallenge.us/' : task.title.includes('NCWIT') ? 'https://www.aspirations.org/' : null
      })));
    }
  }, [profile, tasks]);

  return (
    <div className="container">
      <h2>Design: Your Game Plan</h2>
      {profile ? (
        <>
          <p>Your personalized roadmap to Ivy+ readiness:</p>
          <ul>
            {tasks.map((task, index) => (
              <li key={index}>
                <strong>{task.title}</strong> - Deadline: {task.deadline}
                {task.resources && <p>Resources: <a href={task.resources} target="_blank">{task.resources}</a></p>}
              </li>
            ))}
          </ul>
          <div className="chat">
            <h3>Planning Chat</h3>
            {chatHistory.filter(msg => ['Awards Agent', 'Academic Agent', 'Passion Project Agent', 'Jenny'].includes(msg.sender)).map((msg, idx) => (
              <p key={idx} className={msg.sender === 'Jenny' ? 'coach' : 'agent'}>
                <strong>{msg.sender}:</strong> {msg.text}
              </p>
            ))}
          </div>
        </>
      ) : (
        <p>Please complete your profile first.</p>
      )}
    </div>
  );
};

export default GamePlan;