import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getDifficultyColor, getCategoryIcon } from '../utils/helpers';

const SimulationCard = ({ scenario }) => {
  const navigate = useNavigate();
  const diffColor = getDifficultyColor(scenario.difficulty);

  return (
    <div className="card" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
      onClick={() => navigate(`/simulation/${scenario._id}`)}>

      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${diffColor}, transparent)`,
      }} />

      {/* Category icon */}
      <span className="scenario-card-icon">{getCategoryIcon(scenario.category)}</span>

      {/* Title */}
      <h3 className="scenario-card-title">{scenario.title}</h3>

      {/* Description */}
      <p className="scenario-card-desc">{scenario.description}</p>

      {/* Footer */}
      <div className="scenario-card-footer">
        <span className="badge" style={{
          background: diffColor + '22', border: `1px solid ${diffColor}`,
          color: diffColor, fontSize: '0.65rem',
        }}>
          {scenario.difficulty}
        </span>
        <span className="scenario-card-meta">
          {scenario.steps?.length || 0} steps · {scenario.maxScore || 100} pts
        </span>
      </div>
    </div>
  );
};

export default SimulationCard;
