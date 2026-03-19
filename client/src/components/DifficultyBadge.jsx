import React from 'react';
import '../styles/games.css';

const CONFIG = {
  easy:   { label: 'EASY',   dot: '🟢', color: '#22c55e', glow: 'rgba(34,197,94,0.35)' },
  medium: { label: 'MEDIUM', dot: '🟡', color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  hard:   { label: 'HARD',   dot: '🟠', color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  expert: { label: 'EXPERT', dot: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,0.45)' },
};

/**
 * DifficultyBadge
 * Props:
 *   level    : 'easy' | 'medium' | 'hard' | 'expert'
 *   compact  : bool — smaller inline pill variant
 */
const DifficultyBadge = ({ level = 'easy', compact = false }) => {
  const cfg = CONFIG[level] ?? CONFIG.easy;

  if (compact) {
    return (
      <span
        className="difficulty-badge-compact"
        style={{ borderColor: cfg.color, color: cfg.color, boxShadow: `0 0 8px ${cfg.glow}` }}
      >
        {cfg.dot} {cfg.label}
      </span>
    );
  }

  return (
    <div
      className="difficulty-badge"
      style={{ borderColor: cfg.color, color: cfg.color, boxShadow: `0 0 14px ${cfg.glow}` }}
    >
      <span className="difficulty-dot">{cfg.dot}</span>
      <span className="difficulty-label">{cfg.label} MODE</span>
    </div>
  );
};

export default DifficultyBadge;
