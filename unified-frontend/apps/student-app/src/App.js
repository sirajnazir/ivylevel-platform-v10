import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './components/Home';
import Profile from './components/Profile';
import GamePlan from './components/GamePlan';
import Execution from './components/Execution';
import './App.css';

const App = () => {
  const [profile, setProfile] = useState(null);
  const [score, setScore] = useState(62); // Huda's initial score
  const [tasks, setTasks] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="nav-logo">College Prep v2.0</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/gameplan">Game Plan</Link>
            <Link to="/execution">Execution</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home score={score} chatHistory={chatHistory} />} />
          <Route path="/profile" element={<Profile setProfile={setProfile} setScore={setScore} setTasks={setTasks} setChatHistory={setChatHistory} />} />
          <Route path="/gameplan" element={<GamePlan profile={profile} tasks={tasks} setTasks={setTasks} setChatHistory={setChatHistory} chatHistory={chatHistory} />} />
          <Route path="/execution" element={<Execution tasks={tasks} setTasks={setTasks} setScore={setScore} score={score} setChatHistory={setChatHistory} chatHistory={chatHistory} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;