import React, { useState, useEffect } from 'react';

const Execution = ({ tasks, setTasks, setScore, score, setChatHistory, chatHistory }) => {
  const [week, setWeek] = useState(1);

  const handleTaskComplete = (index) => {
    const newTasks = [...tasks];
    newTasks[index].completed = true;
    setTasks(newTasks);
    const scoreIncrease = index <= 2 ? 5 : 3; // Bigger boost for awards/SAT
    setScore(prev => Math.min(100, prev + scoreIncrease));
    setChatHistory(prev => [
      ...prev,
      { sender: 'Task Agent', text: `Huda completed ${newTasks[index].title}!` },
      { sender: 'Jenny', text: `Amazing work on ${newTasks[index].title}, Huda! Your score’s climbing—keep it up!` }
    ]);
  };

  useEffect(() => {
    if (week === 1) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'Scheduler Agent', text: 'Week 1: Start SAT practice and plan Folklift interviews.' },
        { sender: 'Academic Agent', text: 'Huda, try a practice SAT this week—aim for 1400 to start.' }
      ]);
    } else if (week === 2 && tasks.some(t => t.title.includes('SAT') && !t.completed)) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'Academic Agent', text: 'No SAT practice yet—let’s prioritize this, Huda!' },
        { sender: 'Jenny', text: 'Huda, I see you’re busy—let’s carve out time for SAT. You’ve got this!' }
      ]);
    }
  }, [week]);

  return (
    <div className="container">
      <h2>Deliver: Execution Phase</h2>
      <h3>Week {week}</h3>
      <ul>
        {tasks.map((task, index) => (
          <li key={index} className={task.completed ? 'completed' : 'pending'}>
            {task.title} - Due: {task.deadline}
            {!task.completed && <button onClick={() => handleTaskComplete(index)}>Mark Complete</button>}
          </li>
        ))}
      </ul>
      <button onClick={() => setWeek(prev => prev + 1)}>Next Week</button>
      <div className="chat">
        <h3>Execution Chat</h3>
        {chatHistory.filter(msg => ['Task Agent', 'Scheduler Agent', 'Academic Agent', 'Jenny'].includes(msg.sender)).map((msg, idx) => (
          <p key={idx} className={msg.sender === 'Jenny' ? 'coach' : 'agent'}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Execution;