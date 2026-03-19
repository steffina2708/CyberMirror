import React, { useEffect, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   THREAT ANALYZER — AI-style rotating insights panel.
   Rotates a new insight every 8 s with a fade transition.
   Works in both light and dark mode.
   ═══════════════════════════════════════════════════════════════════ */

const INSIGHTS = [
  { icon: '📈', text: 'Phishing attacks increased by 12% in the last 24 hours.' },
  { icon: '🛡️', text: 'Your vulnerability score is LOW — keep training!' },
  { icon: '⚠️', text: 'Most common active threat: Credential phishing campaigns.' },
  { icon: '🔍', text: 'SQL injection probes peaked at 08:00 UTC today.' },
  { icon: '🌐', text: '3 new zero-day CVEs published — vendor patches available.' },
  { icon: '🤖', text: 'No anomalies detected in your session patterns.' },
  { icon: '📊', text: 'Global ransomware incidents up 8% this week.' },
  { icon: '✅', text: 'System integrity check passed — all services operational.' },
  { icon: '🔐', text: 'MFA adoption improves breach prevention by up to 99.9%.' },
  { icon: '🚨', text: 'Social engineering remains the #1 attack entry point.' },
];

export default function ThreatAnalyzer() {
  const [idx, setIdx]       = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % INSIGHTS.length);
        setFading(false);
      }, 400);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const insight = INSIGHTS[idx];

  return (
    <div className="threat-analyzer">
      {/* Top accent line via ::before */}
      <div className="threat-analyzer-header">
        <span className="threat-analyzer-icon" aria-hidden="true">🤖</span>
        <span className="threat-analyzer-title">AI THREAT ANALYZER</span>
        <span className="threat-analyzer-badge">LIVE</span>
      </div>

      <div className={`threat-analyzer-body${fading ? ' fading' : ''}`}>
        <span className="threat-analyzer-insight-icon" aria-hidden="true">{insight.icon}</span>
        <p className="threat-analyzer-insight">{insight.text}</p>
      </div>

      {/* Progress dots */}
      <div className="threat-analyzer-footer">
        {INSIGHTS.map((_, i) => (
          <span
            key={i}
            className={`threat-analyzer-dot${i === idx ? ' active' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
