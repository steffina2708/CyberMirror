import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';

const SITES = [
  {
    id: 1,
    url: 'https://www.paypa1.com/signin',
    favicon: '💳',
    title: 'PayPal — Log in to your account',
    badge: 'Not Secure',
    badgeColor: '#ef4444',
    body: 'Enter your email and password to access your PayPal account. Your financial information is safe with us.',
    isFake: true,
    clues: ['paypa1.com (digit 1 instead of l)', 'HTTP not HTTPS', 'Generic body text'],
  },
  {
    id: 2,
    url: 'https://www.amazon.com/deals',
    favicon: '📦',
    title: 'Amazon — Today\'s Deals',
    badge: 'Secure',
    badgeColor: '#22c55e',
    body: 'Shop today\'s deals at Amazon. Browse electronics, fashion, home & more. Prime members get free delivery.',
    isFake: false,
    clues: ['Legitimate amazon.com domain', 'HTTPS secure connection', 'Expected page content'],
  },
  {
    id: 3,
    url: 'https://g00gle-login.com/accounts',
    favicon: '🔍',
    title: 'Google — Sign in',
    badge: 'Not Secure',
    badgeColor: '#ef4444',
    body: 'Sign in to continue to your Google account. Enter your email address to get started.',
    isFake: true,
    clues: ['g00gle-login.com (zeros instead of o)', 'External domain, not google.com', 'Subdirectory /accounts is suspicious'],
  },
  {
    id: 4,
    url: 'https://github.com/login',
    favicon: '🐙',
    title: 'Sign in to GitHub',
    badge: 'Secure',
    badgeColor: '#22c55e',
    body: 'Sign in to GitHub to continue to your projects. New to GitHub? Create an account.',
    isFake: false,
    clues: ['Legitimate github.com domain', 'HTTPS', 'Correct login path /login'],
  },
  {
    id: 5,
    url: 'http://netfIix-account-verify.info/login',
    favicon: '🎬',
    title: 'Netflix — Verify Your Account',
    badge: 'Not Secure',
    badgeColor: '#ef4444',
    body: 'Your Netflix account needs verification. Please enter your payment details to continue watching.',
    isFake: true,
    clues: ['netfIix (capital I instead of l)', '.info TLD is suspicious', 'Requesting payment details unexpectedly'],
  },
];

const FakeWebsiteHunter = () => {
  const navigate = useNavigate();
  const [phase,    setPhase]    = useState('idle');
  const [index,    setIndex]    = useState(0);
  const [score,    setScore]    = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [answers,  setAnswers]  = useState([]);

  const site = SITES[index];

  const { endGame } = useGame();
  const awardedRef  = useRef(false);

  // ── Award XP when the round ends ────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: Math.max(25, Math.floor(score * 0.5)), gameType: 'game', badgeIds: [] });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { awardedRef.current = false; setPhase('playing'); setIndex(0); setScore(0); setFeedback(null); setAnswers([]); };

  const answer = useCallback((isFake) => {
    if (feedback) return;
    const correct = isFake === site.isFake;
    setScore(s => s + (correct ? 20 : 0));
    setAnswers(a => [...a, { id: site.id, correct }]);
    setFeedback({ correct, clues: site.clues, expected: site.isFake });
    setTimeout(() => {
      setFeedback(null);
      if (index + 1 >= SITES.length) setPhase('result');
      else setIndex(i => i + 1);
    }, 2000);
  }, [feedback, site, index]);

  const accuracy = answers.length ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;

  if (phase === 'idle') return (
    <div className="dashboard-layout"><Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>← Back to Cyber Games</button>
        <div className="game-shell">
          <span className="game-shell-icon">🕵️</span>
          <h1 className="game-shell-title">Fake Website Hunter</h1>
          <p className="game-shell-desc">Examine each website's URL, SSL badge, and content. Decide: real or fake?</p>
          <div className="game-coming-soon">
            <div className="game-features-grid">
              {[['🌐','5 websites to examine'],['🔍','URL analysis required'],['🏆','20 pts each'],['💡','Clue breakdown']].map(([ic,lb]) => (
                <div key={lb} className="game-feature-item"><span className="game-feature-icon">{ic}</span><span className="game-feature-label">{lb}</span></div>
              ))}
            </div>
            <button className="game-card-btn" style={{ maxWidth: 220, margin: '28px auto 0', justifyContent: 'center' }} onClick={start}>Start Game</button>
          </div>
        </div>
      </main>
    </div>
  );

  if (phase === 'result') return (
    <div className="dashboard-layout"><Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>← Back to Cyber Games</button>
        <div className="game-shell">
          <div className="game-coming-soon">
            <span style={{ fontSize: '3rem' }}>{score >= 80 ? '🏆' : '🎯'}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', marginTop: 12 }}>
              {score >= 80 ? 'Expert Investigator!' : 'Good Effort!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Score: <strong style={{ color: 'var(--accent)' }}>{score}</strong> pts · Accuracy: <strong>{accuracy}%</strong>
            </p>
            <button className="game-card-btn" style={{ maxWidth: 200, margin: '0 auto', justifyContent: 'center' }} onClick={start}>Play Again</button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-layout"><Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>← Back to Cyber Games</button>
        <div className="game-shell">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20,
            padding: '8px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>Site {index+1}/{SITES.length}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{score} pts</span>
          </div>

          {/* Browser mockup */}
          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: 'var(--bg)', padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: 'var(--card)', borderRadius: 4, padding: '5px 12px', fontSize: '0.8rem',
                fontFamily: 'monospace', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: site.badgeColor, fontSize: '0.7rem', fontWeight: 700 }}>🔒 {site.badge}</span>
                <span>{site.url}</span>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', gap: 8 }}>
                <span>{site.favicon}</span> {site.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{site.body}</div>
            </div>
          </div>

          {feedback ? (
            <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16,
              background: feedback.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${feedback.correct ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
              <div style={{ fontWeight: 700, color: feedback.correct ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
                {feedback.correct ? '✓ Correct!' : `✗ ${feedback.expected ? 'That was fake!' : 'That was legitimate!'}`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{feedback.clues.join(' · ')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button className="game-card-btn" style={{ justifyContent: 'center', borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }} onClick={() => answer(true)}>🚨 Fake Site</button>
              <button className="game-card-btn" style={{ justifyContent: 'center', borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.08)', color: '#22c55e' }} onClick={() => answer(false)}>✓ Legitimate</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FakeWebsiteHunter;
