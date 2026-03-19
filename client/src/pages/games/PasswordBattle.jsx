import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import DifficultyBadge from '../../components/DifficultyBadge';
import useDifficulty from '../../hooks/useDifficulty';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Password strength scorer ─────────────────────────────────────
const scorePassword = (pw) => {
  let s = 0;
  if (pw.length >= 8)  s += 20;
  if (pw.length >= 12) s += 15;
  if (pw.length >= 16) s += 15;
  if (/[A-Z]/.test(pw)) s += 10;
  if (/[a-z]/.test(pw)) s += 10;
  if (/[0-9]/.test(pw)) s += 10;
  if (/[^A-Za-z0-9]/.test(pw)) s += 20;
  if (/(.)\1{2,}/.test(pw)) s -= 15;
  if (['password','123456','qwerty','abc123'].some(b => pw.toLowerCase().includes(b))) s -= 30;
  return Math.max(0, Math.min(100, s));
};

const strengthLabel = (s) => {
  if (s < 25) return { label: 'Very Weak',  color: '#ef4444' };
  if (s < 50) return { label: 'Weak',       color: '#f97316' };
  if (s < 70) return { label: 'Fair',       color: '#f59e0b' };
  if (s < 90) return { label: 'Strong',     color: '#22c55e' };
  return              { label: 'Fortress',  color: '#6366f1' };
};

const TIPS = [
  'Use 16+ characters for maximum entropy',
  'Mix uppercase, lowercase, digits and symbols',
  'Avoid dictionary words or repeated chars',
  'Passphrases (random words) are both strong and memorable',
  'Never reuse passwords across sites',
];

const PasswordBattle = () => {
  const navigate = useNavigate();
  const [pw,  setPw]  = useState('');
  const [tip, setTip] = useState(0);

  const score    = scorePassword(pw);
  const strength = strengthLabel(score);

  const nextTip = useCallback(() => setTip(t => (t + 1) % TIPS.length), []);

  const { endGame } = useGame();
  const awardedRef  = useRef(false);
  const { level }   = useDifficulty();

  // ── Award XP the first time a Fortress-strength password is built ───
  useEffect(() => {
    if (score < 90 || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: 35, gameType: 'game', badgeIds: ['password_master'] });
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>
          ← Back to Cyber Games
        </button>

        <div className="game-shell">
          <span className="game-shell-icon">🔐</span>
          <h1 className="game-shell-title">Password Battle</h1>
          <p className="game-shell-desc">
            Build the strongest password you can. The meter analyzes strength in real time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <DifficultyBadge level={level} compact />
          </div>

          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            {/* Input */}
            <input
              type="text"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Type your password here…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 16px',
                color: 'var(--text-primary)', fontSize: '1rem',
                fontFamily: 'monospace', outline: 'none', marginBottom: 16,
              }}
            />

            {/* Strength bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>
                  STRENGTH
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: strength.color, fontFamily: 'var(--font-display)' }}>
                  {pw ? strength.label : '—'} {pw ? `(${score}/100)` : ''}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 20,
                  width: `${score}%`,
                  background: strength.color,
                  transition: 'width 0.3s ease, background 0.3s ease',
                  boxShadow: pw ? `0 0 10px ${strength.color}88` : 'none',
                }} />
              </div>
            </div>

            {/* Stats */}
            {pw && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  ['Length',  pw.length],
                  ['Upper',   (pw.match(/[A-Z]/g)||[]).length],
                  ['Digits',  (pw.match(/[0-9]/g)||[]).length],
                  ['Symbols', (pw.match(/[^A-Za-z0-9]/g)||[]).length],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent)' }}>{v}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tip rotator */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 4 }}>
                  PRO TIP
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {TIPS[tip]}
                </div>
              </div>
              <button onClick={nextTip} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0 }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PasswordBattle;
