import React, { useEffect } from 'react';
import { fireLevelUpConfetti, playSound } from '../utils/gameEffects';
import '../styles/xp.css';

/**
 * LevelUpModal — celebration overlay when user levels up
 * Props:
 *   newLevel : number
 *   xpGained : number
 *   onClose  : ()=>void
 */
const LevelUpModal = ({ newLevel = 2, xpGained = 0, onClose }) => {
  useEffect(() => {
    fireLevelUpConfetti();
    playSound('levelup');
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="levelup-overlay" onClick={onClose}>
      <div className="levelup-box" onClick={e => e.stopPropagation()}>

        {/* Burst rays */}
        <div className="levelup-rays" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="levelup-ray"
              style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>

        <div className="levelup-emoji">🎉</div>
        <div className="levelup-title">LEVEL UP!</div>
        <div className="levelup-badge">
          <span className="levelup-level">{newLevel}</span>
          <span className="levelup-lvl-label">LEVEL</span>
        </div>
        <p className="levelup-sub">You reached <strong>Level {newLevel}</strong></p>
        {xpGained > 0 && (
          <div className="levelup-xp-gained">+{xpGained} XP earned</div>
        )}

        <button className="levelup-btn" onClick={onClose}>Continue →</button>
      </div>
    </div>
  );
};

export default LevelUpModal;
