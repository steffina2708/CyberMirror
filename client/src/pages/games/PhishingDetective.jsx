import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';
import PhishingDetectiveGame from './PhishingDetectiveGame';

const PhishingDetective = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>
          ← Back to Cyber Games
        </button>

        <div className="game-shell">
          <span className="game-shell-icon">🎣</span>
          <h1 className="game-shell-title">Phishing Detective</h1>
          <p className="game-shell-desc">
            Examine suspicious emails, links, and sender details. Flag every phishing attempt before the timer runs out.
          </p>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span className="game-shell-badge">🟢 Easy · Solo · Timed</span>
          </div>
          <PhishingDetectiveGame />
        </div>
      </main>
    </div>
  );
};

export default PhishingDetective;
