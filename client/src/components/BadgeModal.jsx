import React, { useEffect } from 'react';
import '../styles/xp.css';

/**
 * BadgeModal — animated popup when one or more badges are unlocked
 * Props:
 *   badges  : [{ id, name, icon, desc }]
 *   onClose : ()=>void
 */
const BadgeModal = ({ badges = [], onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!badges || badges.length === 0) return null;

  return (
    <div className="badge-modal-overlay" onClick={onClose}>
      <div className="badge-modal-box" onClick={e => e.stopPropagation()}>
        <div className="badge-modal-confetti" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="badge-confetti-dot" style={{
              left:  `${5 + i * 8}%`,
              animationDelay: `${i * 0.07}s`,
              background: ['#00f5ff','#a855f7','#f59e0b','#22c55e','#ec4899'][i % 5],
            }} />
          ))}
        </div>

        <div className="badge-modal-header">
          🎉 Badge{badges.length > 1 ? 's' : ''} Unlocked!
        </div>

        <div className="badge-modal-list">
          {badges.map((b, i) => (
            <div key={b.id || i} className="badge-modal-item" style={{ animationDelay: `${i * 0.12}s` }}>
              <span className="badge-modal-icon">{b.icon}</span>
              <div className="badge-modal-info">
                <div className="badge-modal-name">{b.name}</div>
                <div className="badge-modal-desc">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="badge-modal-close" onClick={onClose}>Got it ✓</button>
      </div>
    </div>
  );
};

export default BadgeModal;
