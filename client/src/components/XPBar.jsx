import React from 'react';
import '../styles/xp.css';

/**
 * XPBar — reusable XP progress bar
 * Props:
 *   totalXP    : number
 *   level      : number
 *   compact    : bool  — smaller layout for dashboard sidebar / header
 *   animated   : bool  — animate bar fill on mount
 */
const XPBar = ({ totalXP = 0, level = 1, compact = false, animated = true }) => {
  const currentLevelXP = totalXP % 100;
  const xpToNext       = 100 - currentLevelXP;
  const pct            = currentLevelXP;

  if (compact) {
    return (
      <div className="xpbar-compact">
        <div className="xpbar-compact-labels">
          <span className="xpbar-level-badge">Lvl {level}</span>
          <span className="xpbar-xp-text">{currentLevelXP} / 100 XP</span>
        </div>
        <div className="xpbar-track">
          <div
            className={`xpbar-fill${animated ? ' xpbar-fill--animated' : ''}`}
            style={{ width: `${pct}%` }}
          />
          <div className="xpbar-glow" style={{ left: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="xpbar-full">
      <div className="xpbar-header">
        <div className="xpbar-level-ring">
          <span className="xpbar-level-number">{level}</span>
          <span className="xpbar-level-label">LVL</span>
        </div>
        <div className="xpbar-details">
          <div className="xpbar-title-row">
            <span className="xpbar-title">XP Progress</span>
            <span className="xpbar-pct">{pct}%</span>
          </div>
          <div className="xpbar-track xpbar-track--full">
            <div
              className={`xpbar-fill${animated ? ' xpbar-fill--animated' : ''}`}
              style={{ width: `${pct}%` }}
            />
            <div className="xpbar-glow" style={{ left: `${pct}%` }} />
          </div>
          <div className="xpbar-sub-row">
            <span className="xpbar-sub">{currentLevelXP} / 100 XP</span>
            <span className="xpbar-sub">{xpToNext} XP to Level {level + 1}</span>
          </div>
        </div>
      </div>
      <div className="xpbar-total">Total XP: {totalXP.toLocaleString()}</div>
    </div>
  );
};

export default XPBar;
