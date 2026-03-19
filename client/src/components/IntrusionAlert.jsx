import React, { useEffect, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   INTRUSION ALERT — floating popup for simulated real-time alerts.
   Auto-shows every 15–25 s, auto-dismisses after 5 s.
   Works in both light and dark mode.
   ═══════════════════════════════════════════════════════════════════ */

const ALERTS = [
  { level: 'CRITICAL', msg: 'Ransomware signature detected on network segment' },
  { level: 'HIGH',     msg: 'Phishing domain flagged: secure-login-verify.net' },
  { level: 'HIGH',     msg: 'Credential stuffing attack blocked — 142 attempts' },
  { level: 'MEDIUM',   msg: 'Suspicious login attempt from 198.51.100.42' },
  { level: 'MEDIUM',   msg: 'Brute-force probe on /api/auth endpoint' },
  { level: 'CRITICAL', msg: 'Data exfiltration attempt intercepted on port 443' },
  { level: 'HIGH',     msg: 'Zero-day exploit signature matched in traffic' },
  { level: 'LOW',      msg: 'External port scan detected — 203.0.113.7' },
  { level: 'MEDIUM',   msg: 'DNS tunnelling behaviour flagged on host 10.0.1.4' },
];

const LEVEL_ICONS = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' };

function randRange(min, max) { return Math.random() * (max - min) + min; }

export default function IntrusionAlert() {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert]     = useState(null);
  const [dismissTid, setDismissTid] = useState(null);

  const showAlert = useCallback(() => {
    const a = ALERTS[Math.floor(Math.random() * ALERTS.length)];
    setAlert(a);
    setVisible(true);
    const tid = setTimeout(() => setVisible(false), 5000);
    setDismissTid(tid);
  }, []);

  // cleanup any pending dismiss when manually closed
  const dismiss = () => {
    if (dismissTid) clearTimeout(dismissTid);
    setVisible(false);
  };

  useEffect(() => {
    let tid;
    const fire = () => {
      showAlert();
      tid = setTimeout(fire, randRange(15000, 25000));
    };
    // First alert after a short delay so the page feels active quickly
    tid = setTimeout(fire, 5000);
    return () => clearTimeout(tid);
  }, [showAlert]);

  if (!visible || !alert) return null;

  return (
    <div className="alert-popup" role="alert">
      <div className="alert-popup-header">
        <span className="alert-blink-dot" />
        <span className={`alert-popup-level alert-level-${alert.level.toLowerCase()}`}>
          {alert.level}
        </span>
        <span className="alert-popup-title">INTRUSION ALERT</span>
        <button className="alert-popup-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
      <div className="alert-popup-body">
        <span className="alert-popup-icon" aria-hidden="true">{LEVEL_ICONS[alert.level]}</span>
        <span className="alert-popup-msg">{alert.msg}</span>
      </div>
    </div>
  );
}
