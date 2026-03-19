import React, { useState, useEffect } from 'react';
import '../styles/xp.css';

/**
 * BadgeToast — sliding top-right notification for a single badge unlock
 * Props:
 *   badge     : { id, name, icon, desc }
 *   onDismiss : ()=>void  — called after exit animation completes
 *   index     : number   — stacking offset (0 = topmost)
 */
const BadgeToast = ({ badge, onDismiss, index = 0 }) => {
  const [exiting, setExiting] = useState(false);

  /* auto dismiss after 3.5 s */
  useEffect(() => {
    const t = setTimeout(() => startDismiss(), 3500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 350);   // wait for slide-out animation
  };

  const offsetTop = 20 + index * 90; // stack multiple toasts

  return (
    <div
      className={`badge-toast ${exiting ? 'badge-toast--exit' : ''}`}
      style={{ top: offsetTop }}
      onClick={startDismiss}
      role="status"
      aria-live="polite"
    >
      <div className="badge-toast-icon">{badge.icon ?? '🏆'}</div>
      <div className="badge-toast-body">
        <div className="badge-toast-header">Badge Unlocked!</div>
        <div className="badge-toast-name">{badge.name}</div>
        {badge.desc && <div className="badge-toast-desc">{badge.desc}</div>}
      </div>
      <button className="badge-toast-close" onClick={startDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
};

export default BadgeToast;
