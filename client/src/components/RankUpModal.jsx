import React, { useEffect } from 'react';
import { fireRankConfetti, playSound } from '../utils/gameEffects';
import '../styles/xp.css';

/**
 * RankUpModal — full-screen rank-promotion celebration
 * Props:
 *   newRank  : string   — new rank label, e.g. 'SENIOR ANALYST'
 *   prevRank : string   — previous rank label
 *   onClose  : ()=>void
 */
const RankUpModal = ({ newRank = 'CYBER DEFENDER', prevRank = '', onClose }) => {
  useEffect(() => {
    fireRankConfetti();
    playSound('rankup');

    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="rank-overlay" onClick={onClose}>
      <div className="rank-card" onClick={e => e.stopPropagation()}>

        {/* Animated corner sparks */}
        <div className="rank-sparks" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rank-spark"
              style={{
                left:             `${Math.random() * 100}%`,
                animationDelay:   `${i * 0.18}s`,
                animationDuration: `${0.8 + Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>

        <div className="rank-medal">🚀</div>
        <div className="rank-card-label">Rank Promoted!</div>

        {prevRank && (
          <div className="rank-prev">{prevRank} →</div>
        )}

        <h1 className="rank-new">{newRank}</h1>

        <p className="rank-sub">Your expertise has been recognized</p>

        <button className="rank-btn" onClick={onClose}>Accept Promotion →</button>
      </div>
    </div>
  );
};

export default RankUpModal;
