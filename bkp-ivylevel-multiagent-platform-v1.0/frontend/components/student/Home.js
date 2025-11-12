import React from 'react';

const Home = ({ score, chatHistory }) => (
  <div className="container">
    <h1>Welcome, Huda!</h1>
    <p>Your current Ivy+ Ready Score: <strong>{score}</strong></p>
    <p>Track your journey to Ivy+ readiness below:</p>
    <div className="chat">
      <h3>Recent Interactions</h3>
      {chatHistory.map((msg, idx) => (
        <p key={idx} className={msg.sender === 'Jenny' ? 'coach' : 'agent'}>
          <strong>{msg.sender}:</strong> {msg.text}
        </p>
      ))}
    </div>
  </div>
);

export default Home;