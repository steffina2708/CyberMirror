import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import DifficultyBadge from '../../components/DifficultyBadge';
import useDifficulty from '../../hooks/useDifficulty';

// ── Email dataset ────────────────────────────────────────────────
const EMAILS = [
  {
    id: 1,
    from: 'security-alert@payp4l-secure.com',
    subject: 'Urgent: Your account has been suspended',
    body: 'Dear customer, we detected unusual activity. Click here immediately to verify your identity or your account will be permanently closed.',
    isPhishing: true,
    clues: ['Misspelled domain (payp4l)', 'Urgency pressure', 'Vague greeting'],
  },
  {
    id: 2,
    from: 'newsletter@spotify.com',
    subject: 'Your June playlist recap is ready 🎵',
    body: 'Hi there! Your monthly music recap is ready. You listened to 47 hours of music this month. See your top artists inside.',
    isPhishing: false,
    clues: ['Legitimate sender domain', 'Non-urgent tone', 'Consistent branding'],
  },
  {
    id: 3,
    from: 'it-support@company-helpdesk.net',
    subject: 'Password reset required — action needed',
    body: 'IT Security: Your password expires in 24 hours. Reset it now using the link below to avoid losing access to all company systems.',
    isPhishing: true,
    clues: ['External domain for internal IT', 'Artificial deadline', 'Threatening consequence'],
  },
  {
    id: 4,
    from: 'no-reply@github.com',
    subject: 'A new SSH key was added to your account',
    body: 'Hey! A new SSH key was added to your GitHub account. If this was you, no action is needed. If not, remove it in your settings.',
    isPhishing: false,
    clues: ['Official GitHub domain', 'No action required tone', 'Security notification format'],
  },
  {
    id: 5,
    from: 'prize-winner@lucky-amazon-draw.info',
    subject: 'Congratulations! You have won a $500 gift card',
    body: 'You have been randomly selected as our lucky winner! Claim your $500 Amazon gift card now — offer expires in 2 hours!',
    isPhishing: true,
    clues: ['Suspicious TLD (.info)', 'Too-good-to-be-true offer', 'Extreme urgency'],
  },
  {
    id: 6,
    from: 'billing@netflix.com',
    subject: 'Your Netflix membership is about to renew',
    body: 'Your Netflix plan will automatically renew on July 1st. Your card ending in 4242 will be charged $15.99. Manage your plan in account settings.',
    isPhishing: false,
    clues: ['Official Netflix domain', 'Specific card detail', 'Standard billing communication'],
  },
];

const TOTAL_TIME = 90; // seconds

const PhishingDetectiveGame = () => {
  const [phase,    setPhase]    = useState('idle');   // idle | playing | result
  const [index,    setIndex]    = useState(0);
  const [score,    setScore]    = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [feedback, setFeedback] = useState(null);    // { correct, clues }
  const [answers,  setAnswers]  = useState([]);

  const email = EMAILS[index];

  const { endGame } = useGame();
  const awardedRef  = useRef(false);
  const { level }   = useDifficulty();

  // ── Award XP when the round ends ────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: Math.max(25, Math.floor(score * 0.4)), gameType: 'game', badgeIds: ['phishing_hunter'] });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('result'); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const start = () => {
    awardedRef.current = false;
    setPhase('playing'); setIndex(0); setScore(0);
    setTimeLeft(TOTAL_TIME); setFeedback(null); setAnswers([]);
  };

  const answer = useCallback((isPhish) => {
    if (feedback) return;
    const correct = isPhish === email.isPhishing;
    const pts = correct ? 20 : 0;
    setScore(s => s + pts);
    setAnswers(a => [...a, { id: email.id, correct }]);
    setFeedback({ correct, clues: email.clues, expected: email.isPhishing });

    setTimeout(() => {
      setFeedback(null);
      if (index + 1 >= EMAILS.length) setPhase('result');
      else setIndex(i => i + 1);
    }, 1800);
  }, [email, feedback, index]);

  const timerColor = timeLeft > 30 ? 'var(--success)' : timeLeft > 10 ? 'var(--warning)' : 'var(--danger)';
  const accuracy   = answers.length ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;

  /* ── IDLE ── */
  if (phase === 'idle') return (
    <div className="game-coming-soon">
      <div className="game-features-grid">
        {[['📧','6 emails to analyze'],['⏱','90 second timer'],['🏆','20 pts per correct'],['💡','Clue reveal on answer']].map(([ic,lb]) => (
          <div key={lb} className="game-feature-item">
            <span className="game-feature-icon">{ic}</span>
            <span className="game-feature-label">{lb}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <DifficultyBadge level={level} compact />
      </div>
      <button className="game-card-btn" style={{ maxWidth: 220, margin: '16px auto 0', justifyContent: 'center' }} onClick={start}>
        Start Game
      </button>
    </div>
  );

  /* ── RESULT ── */
  if (phase === 'result') return (
    <div className="game-coming-soon">
      <span style={{ fontSize: '3rem' }}>{score >= 100 ? '🏆' : score >= 60 ? '🎯' : '📚'}</span>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', marginTop: 12 }}>
        {score >= 100 ? 'Expert Detective!' : score >= 60 ? 'Good Work!' : 'Keep Practicing'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
        Score: <strong style={{ color: 'var(--accent)' }}>{score}</strong> pts &nbsp;·&nbsp; Accuracy: <strong>{accuracy}%</strong>
      </p>
      <button className="game-card-btn" style={{ maxWidth: 200, margin: '0 auto', justifyContent: 'center' }} onClick={start}>
        Play Again
      </button>
    </div>
  );

  /* ── PLAYING ── */
  return (
    <div>
      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
        padding: '10px 16px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          Email {index + 1} / {EMAILS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: timerColor }}>
          ⏱ {timeLeft}s
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--accent)' }}>
          {score} pts
        </span>
      </div>

      {/* Email card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'monospace' }}>
          From: <span style={{ color: 'var(--text-secondary)' }}>{email.from}</span>
        </div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontSize: '0.95rem' }}>
          {email.subject}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          {email.body}
        </div>
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: feedback.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${feedback.correct ? 'rgba(34,197,94,0.40)' : 'rgba(239,68,68,0.40)'}` }}>
          <div style={{ fontWeight: 700, color: feedback.correct ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
            {feedback.correct ? '✓ Correct!' : `✗ ${feedback.expected ? 'That was a phishing email!' : 'That was legitimate!'}`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {feedback.clues.join(' · ')}
          </div>
        </div>
      )}

      {/* Answer buttons */}
      {!feedback && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button className="game-card-btn" style={{ justifyContent: 'center', borderColor: 'rgba(239,68,68,0.5)',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444' }} onClick={() => answer(true)}>
            🚨 Phishing!
          </button>
          <button className="game-card-btn" style={{ justifyContent: 'center', borderColor: 'rgba(34,197,94,0.5)',
            background: 'rgba(34,197,94,0.08)', color: '#22c55e' }} onClick={() => answer(false)}>
            ✓ Legitimate
          </button>
        </div>
      )}
    </div>
  );
};

export default PhishingDetectiveGame;
