import React from 'react';
import { useNavigate } from 'react-router-dom';

const complexityColor = {
  Beginner:     'var(--success, #22c55e)',
  Intermediate: 'var(--warning, #f59e0b)',
  Advanced:     'var(--danger,  #ef4444)',
};

const LabCard = ({ icon, title, complexity, description, route, tags = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="lab-card" onClick={() => navigate(route)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(route)}>

      <div className="lab-card-top">
        <span className="lab-card-icon">{icon}</span>
        <span
          className="lab-card-complexity"
          style={{ color: complexityColor[complexity] ?? 'var(--accent)' }}
        >
          {complexity}
        </span>
      </div>

      <h3 className="lab-card-title">{title}</h3>
      <p className="lab-card-desc">{description}</p>

      {tags.length > 0 && (
        <div className="lab-card-tags">
          {tags.map(t => <span key={t} className="lab-card-tag">{t}</span>)}
        </div>
      )}

      <button className="lab-card-btn" onClick={e => { e.stopPropagation(); navigate(route); }}>
        <span>Enter Lab</span>
        <span>⚗</span>
      </button>
    </div>
  );
};

export default LabCard;
