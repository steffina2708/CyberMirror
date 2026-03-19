import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import DifficultyBadge from '../../components/DifficultyBadge';
import useDifficulty from '../../hooks/useDifficulty';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Alert database ───────────────────────────────────────────────
const ALERTS = [
  {
    id: 1,
    severity: 'critical',
    icon: '🦠',
    title: 'Malware Detected',
    system: 'ENDPOINT-07 (Finance Dept)',
    detail: 'Ransomware signature detected in C:\\Users\\jsmith\\Downloads\\invoice.exe. Process is attempting to encrypt shared drives.',
    timestamp: '02:14:33',
    options: [
      { label: 'Isolate the device from network',   correct: true,  points: 30, explanation: '✅ Correct! Isolating the device stops lateral spread immediately.' },
      { label: 'Restart the device',                correct: false, points: -10, explanation: '❌ Restarting may resume the ransomware process on boot.' },
      { label: 'Delete the file manually',           correct: false, points: -10, explanation: '❌ The malware may already be in memory — deletion alone is insufficient.' },
      { label: 'Ignore — wait for user report',      correct: false, points: -20, explanation: '❌ Every second counts. Ransomware spreads across shared drives rapidly.' },
    ],
  },
  {
    id: 2,
    severity: 'high',
    icon: '🔓',
    title: 'Unauthorized Login',
    system: 'VPN Gateway · admin account',
    detail: 'Login attempt from 185.220.101.45 (Tor exit node). 47 failed attempts followed by one successful authentication at 03:02:11 UTC.',
    timestamp: '03:02:11',
    options: [
      { label: 'Revoke session & reset credentials',   correct: true,  points: 30, explanation: '✅ Correct! Revoking the active session + credential reset stops the intruder.' },
      { label: 'Monitor traffic passively',             correct: false, points: -15, explanation: '❌ Passive monitoring allows the attacker to continue operating.' },
      { label: 'Block the IP only',                    correct: false, points: 10,  explanation: '⚠ Partial — IP block helps, but the active session is still live.' },
      { label: 'Disable all VPN access company-wide',  correct: false, points: -5,  explanation: '❌ Overkill — disrupts operations without targeting the specific threat.' },
    ],
  },
  {
    id: 3,
    severity: 'high',
    icon: '📤',
    title: 'Data Exfiltration Alert',
    system: 'DBSERVER-01 · outbound traffic',
    detail: '3.2 GB of outbound traffic to 91.108.4.22 (Russia) over the past 20 minutes. Pattern matches database dump exfiltration.',
    timestamp: '04:51:07',
    options: [
      { label: 'Block outbound connection to flagged IP', correct: true,  points: 30, explanation: '✅ Correct! Blocking the destination immediately stops the active leak.' },
      { label: 'Shut down the database server',         correct: false, points: 5,   explanation: '⚠ Stops exfil but creates downtime — blocking the IP is more surgical.' },
      { label: 'Send a warning email to the DBA',       correct: false, points: -15, explanation: '❌ Way too slow. The leak continues while waiting for a response.' },
      { label: 'Increase firewall logging verbosity',    correct: false, points: -10, explanation: '❌ Logging doesn\'t stop the exfiltration — action is needed now.' },
    ],
  },
  {
    id: 4,
    severity: 'medium',
    icon: '🎣',
    title: 'Phishing Campaign Detected',
    system: 'Mail Gateway · 38 employees',
    detail: 'A wave of emails spoofing payroll@company.com has passed initial filters and landed in 38 inboxes. Subject: "Urgent: Update your banking details".',
    timestamp: '09:17:44',
    options: [
      { label: 'Quarantine emails & alert all staff',   correct: true,  points: 30, explanation: '✅ Correct! Quarantining removes the threat and user awareness prevents clicks.' },
      { label: 'Delete from server — no user notice',   correct: false, points: 5,   explanation: '⚠ Silent deletion misses any already-opened emails.' },
      { label: 'Reply to sender with a warning',        correct: false, points: -20, explanation: '❌ Engaging attackers can confirm your email address is active.' },
      { label: 'Wait for users to report it',           correct: false, points: -15, explanation: '❌ Even one click could compromise credentials.' },
    ],
  },
  {
    id: 5,
    severity: 'critical',
    icon: '🌊',
    title: 'DDoS Attack In Progress',
    system: 'Web Server · 94% CPU',
    detail: '420,000 req/sec from 1,200 distributed IPs. Server response time: 12,000ms. External customers cannot access the portal.',
    timestamp: '11:33:59',
    options: [
      { label: 'Enable rate limiting + CDN scrubbing',  correct: true,  points: 30, explanation: '✅ Correct! Rate limiting + upstream scrubbing absorbs and filters the flood.' },
      { label: 'Reboot the web server',                 correct: false, points: -10, explanation: '❌ Rebooting creates downtime without stopping the inbound traffic.' },
      { label: 'Block all international traffic',       correct: false, points: 5,   explanation: '⚠ Geo-blocking may reduce load but breaks legitimate international access.' },
      { label: 'Increase server RAM',                   correct: false, points: -20, explanation: '❌ Hardware scaling doesn\'t help against a volumetric flood.' },
    ],
  },
  {
    id: 6,
    severity: 'medium',
    icon: '🔑',
    title: 'Privilege Escalation',
    system: 'WORKSTATION-14 · dev-user01',
    detail: 'User dev-user01 executed "sudo su -" and now has root privileges. This account has no authorized escalation policy.',
    timestamp: '14:02:18',
    options: [
      { label: 'Revoke root access & investigate',       correct: true,  points: 30, explanation: '✅ Correct! Revoking first, then investigating, limits potential damage.' },
      { label: 'Ask the user why they escalated',        correct: false, points: -5,  explanation: '⚠ Social engineering risk — verify through proper ticketing, not chat.' },
      { label: 'Disable the account entirely',           correct: false, points: 10,  explanation: '⚠ Stops the threat but may disrupt legitimate work if accidental.' },
      { label: 'Update the audit log and monitor',       correct: false, points: -15, explanation: '❌ Logging without action leaves the escalated session active.' },
    ],
  },
];

const SEV_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6' };
const SEV_BG     = { critical: 'rgba(239,68,68,0.08)', high: 'rgba(245,158,11,0.08)', medium: 'rgba(59,130,246,0.08)' };

const CyberDefenseStrategy = () => {
  const navigate = useNavigate();
  const [phase,    setPhase]    = useState('briefing'); // briefing | playing | result
  const [alertIdx, setAlertIdx] = useState(0);
  const [score,    setScore]    = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState([]);

  const alert = ALERTS[alertIdx];

  const { endGame } = useGame();
  const awardedRef  = useRef(false);

  // ── Award XP when all alerts resolved ────────────────────────
  useEffect(() => {
    if (phase !== 'result' || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: Math.max(25, Math.floor(score * 0.4)), gameType: 'game', badgeIds: ['soc_analyst'] });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = useCallback((optIdx) => {
    if (selected !== null) return;
    const opt = alert.options[optIdx];
    setSelected(optIdx);
    setScore(s => Math.max(0, s + opt.points));
    setFeedback({ text: opt.explanation, correct: opt.correct });
    setAnswered(a => [...a, { alertId: alert.id, points: opt.points, correct: opt.correct }]);
  }, [selected, alert]);

  const next = useCallback(() => {
    if (alertIdx < ALERTS.length - 1) {
      setAlertIdx(i => i + 1);
      setSelected(null);
      setFeedback(null);
    } else {
      setPhase('result');
    }
  }, [alertIdx]);

  const restart = () => {
    awardedRef.current = false;
    setPhase('briefing'); setAlertIdx(0); setScore(0);
    setSelected(null); setFeedback(null); setAnswered([]);
  };

  const maxScore   = ALERTS.length * 30;
  const pct        = Math.round((score / maxScore) * 100);
  const correctCnt = answered.filter(a => a.correct).length;
  const grade      = pct >= 85 ? { label: 'Elite Analyst',   color: '#22c55e', icon: '🏆' }
                   : pct >= 60 ? { label: 'Senior Analyst',  color: 'var(--accent)', icon: '🥈' }
                   : pct >= 35 ? { label: 'Junior Analyst',  color: '#f59e0b', icon: '🥉' }
                   :             { label: 'Needs Training',   color: '#ef4444', icon: '❌' };

  const { level } = useDifficulty();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>← Back to Cyber Games</button>

        {/* ── Briefing ─────────────────────────────────────── */}
        {phase === 'briefing' && (
          <div className="game-shell" style={{ maxWidth: 640 }}>
            <span className="game-shell-icon">🛡️</span>
            <h1 className="game-shell-title">Cyber Defense Strategy</h1>
            <p className="game-shell-desc">
              You are the lead SOC analyst. Real-time security alerts are incoming.
              Analyse each incident and choose the correct response strategy.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              {[
                ['🚨', 'Alerts',   `${ALERTS.length} live incidents to triage`],
                ['🎯', 'Scoring',  '30 pts per correct response, penalties for wrong choices'],
                ['⏱️', 'Format',   'Self-paced — read the details carefully'],
              ].map(([icon, label, desc]) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <DifficultyBadge level={level} compact />
            </div>
            <button className="game-card-btn" style={{ justifyContent: 'center' }} onClick={() => setPhase('playing')}>
              🚀 Start Incident Response
            </button>
          </div>
        )}

        {/* ── Playing ──────────────────────────────────────── */}
        {phase === 'playing' && (
          <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(alertIdx / ALERTS.length) * 100}%`,
                  background: 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                Alert {alertIdx + 1}/{ALERTS.length}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                {score} pts
              </span>
            </div>

            {/* Alert card */}
            <div style={{ background: 'var(--card)', border: `1px solid ${SEV_COLORS[alert.severity]}55`,
              borderRadius: 12, boxShadow: `0 0 24px ${SEV_COLORS[alert.severity]}18`, marginBottom: 18, overflow: 'hidden' }}>
              <div style={{ background: SEV_BG[alert.severity], borderBottom: `1px solid ${SEV_COLORS[alert.severity]}33`,
                padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{alert.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700,
                      fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: SEV_COLORS[alert.severity], color: '#fff' }}>
                      {alert.severity}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {alert.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    🖥 {alert.system} &nbsp;·&nbsp; 🕐 {alert.timestamp} UTC
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', background: '#020617', fontFamily: 'Courier New, monospace',
                fontSize: '0.8rem', lineHeight: 1.75, color: '#94a3b8' }}>
                {alert.detail}
              </div>
            </div>

            {/* Response options */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
                color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
                Choose your response
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {alert.options.map((opt, i) => {
                  let bg = 'var(--card)', border = 'var(--border)';
                  if (selected !== null) {
                    if (i === selected && opt.correct)  { bg = 'rgba(34,197,94,0.10)'; border = '#22c55e66'; }
                    if (i === selected && !opt.correct) { bg = 'rgba(239,68,68,0.10)'; border = '#ef444466'; }
                    if (opt.correct)                    { bg = 'rgba(34,197,94,0.06)'; border = '#22c55e44'; }
                  }
                  return (
                    <button key={i} disabled={selected !== null} onClick={() => choose(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                        background: bg, border: `1px solid ${border}`, borderRadius: 8,
                        cursor: selected !== null ? 'default' : 'pointer', color: 'var(--text-secondary)',
                        fontSize: '0.84rem', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'var(--font-body)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                        flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt.label}
                      {selected !== null && opt.correct && <span style={{ marginLeft: 'auto', color: '#22c55e' }}>✓</span>}
                      {selected === i && !opt.correct   && <span style={{ marginLeft: 'auto', color: '#ef4444' }}>✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{ padding: '14px 18px', borderRadius: 8, marginBottom: 16,
                background: feedback.correct ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${feedback.correct ? '#22c55e44' : '#ef444444'}`,
                fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {feedback.text}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="game-card-btn" style={{ justifyContent: 'center', padding: '9px 22px' }} onClick={next}>
                    {alertIdx < ALERTS.length - 1 ? 'Next Alert →' : 'View Results →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────── */}
        {phase === 'result' && (
          <div className="game-shell" style={{ maxWidth: 560 }}>
            <span style={{ fontSize: '3rem' }}>{grade.icon}</span>
            <h1 className="game-shell-title" style={{ color: grade.color }}>{grade.label}</h1>
            <p className="game-shell-desc">Incident response complete. Here's your performance breakdown.</p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', border: `6px solid ${grade.color}`,
                boxShadow: `0 0 24px ${grade.color}44`, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, color: grade.color }}>{pct}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{score}/{maxScore} pts</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[['✅ Correct', `${correctCnt}/${ALERTS.length}`], ['❌ Wrong', `${ALERTS.length - correctCnt}/${ALERTS.length}`],
                ['📈 Score', `${score} pts`], ['🎯 Accuracy', `${pct}%`]].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px',
                  border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 22 }}>
              {answered.map((a, i) => {
                const al = ALERTS.find(x => x.id === a.alertId);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                    borderBottom: '1px solid var(--border)', fontSize: '0.79rem' }}>
                    <span>{al?.icon}</span>
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{al?.title}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                      color: a.correct ? '#22c55e' : a.points > 0 ? '#f59e0b' : '#ef4444' }}>
                      {a.points > 0 ? '+' : ''}{a.points} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="game-card-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={restart}>🔄 Retry</button>
              <button className="game-back-btn" style={{ flex: 1 }} onClick={() => navigate('/cyber-games')}>← All Games</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CyberDefenseStrategy;
