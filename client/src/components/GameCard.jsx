import React from 'react';
import { useNavigate } from 'react-router-dom';

const difficultyColor = {
  Easy:   'var(--success, #22c55e)',
  Medium: 'var(--warning, #f59e0b)',
  Hard:   'var(--danger,  #ef4444)',
  Expert: '#a855f7',
};

const GameCard = ({ icon, title, difficulty, description, route, players }) => {
  const navigate = useNavigate();

  return (
    <div className="game-card" onClick={() => navigate(route)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(route)}>

      <div className="game-card-icon">{icon}</div>

      <div className="game-card-header">
        <h3 className="game-card-title">{title}</h3>
        <span
          className="game-card-difficulty"
          style={{ color: difficultyColor[difficulty] ?? 'var(--accent)' }}
        >
          {difficulty}
        </span>
      </div>

      <p className="game-card-desc">{description}</p>

      {players && (
        <div className="game-card-meta">
          <span className="game-card-players">👥 {players} playing</span>
        </div>
      )}

      <button className="game-card-btn" onClick={e => { e.stopPropagation(); navigate(route); }}>
        <span>Launch Game</span>
        <span className="game-card-btn-arrow">→</span>
      </button>

      {/* Hover spotlight */}
      <div className="game-card-spotlight" aria-hidden="true" />
    </div>
  );
};

export default GameCard;
