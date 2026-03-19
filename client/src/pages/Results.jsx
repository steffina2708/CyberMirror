import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import simulationService from '../services/simulationService';
import { getScoreGrade } from '../utils/helpers';
import '../styles/simulation.css';

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badgeModal, setBadgeModal] = useState(null);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const [levelUpData, setLevelUpData] = useState(null);

  useEffect(() => {
    simulationService.getSessionResult(sessionId)
      .then(data => {
        setResult(data.result);
        if (data.result?.newBadges?.length > 0) {
          setBadgeQueue(data.result.newBadges);
          setBadgeModal(data.result.newBadges[0]);
        }
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));

    // Check for level-up from Simulation page
    const lu = sessionStorage.getItem('cm_levelup');
    if (lu) {
      try { setLevelUpData(JSON.parse(lu)); } catch {}
      sessionStorage.removeItem('cm_levelup');
    }
  }, [sessionId]);

  const dismissLevelUp = () => setLevelUpData(null);

  const dismissBadge = () => {
    const remaining = badgeQueue.slice(1);
    setBadgeQueue(remaining);
    setBadgeModal(remaining.length > 0 ? remaining[0] : null);
  };

  if (loading) return (
    <div className="results-page">
      <div className="results-loading">CALCULATING RESULTS...</div>
    </div>
  );

  if (!result) return null;

  const gradeInfo = getScoreGrade(result.score, result.maxScore);
  const pct = Math.round((result.score / result.maxScore) * 100);

  return (
    <div className="results-page">
      <div className="results-inner">
        {/* Grade circle */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            className="results-grade-circle"
            style={{ border: `3px solid ${gradeInfo.color}`, boxShadow: `0 0 30px ${gradeInfo.color}44` }}
          >
            <div className="results-grade-letter" style={{ color: gradeInfo.color }}>
              {gradeInfo.grade}
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: gradeInfo.color }}>
            {gradeInfo.label}
          </h1>
          <p className="results-scenario-title">{result.scenarioTitle}</p>
        </div>

        {/* Score breakdown */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="results-stat-grid">
            <div>
              <div className="results-stat-value" style={{ color: 'var(--cyan)' }}>{result.score}</div>
              <div className="results-stat-label">Score</div>
            </div>
            <div>
              <div className="results-stat-value" style={{ color: 'var(--green)' }}>
                {result.correctAnswers}/{result.totalSteps}
              </div>
              <div className="results-stat-label">Correct</div>
            </div>
            <div>
              <div className="results-stat-value" style={{ color: 'var(--yellow)' }}>{pct}%</div>
              <div className="results-stat-label">Accuracy</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="results-score-bar-wrap">
            <div className="results-score-bar-fill" style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, var(--accent), ${gradeInfo.color})`,
            }} />
          </div>
        </div>

        {/* New badges */}
        {result.newBadges && result.newBadges.length > 0 && (
          <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              New Badges Unlocked
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {result.newBadges.map((badge, i) => (
                <div key={i} className="badge-chip">🏆 {badge.name}</div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="results-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/leaderboard')}>
            View Leaderboard
          </button>
        </div>
      </div>

      {/* Badge unlock modal */}
      {badgeModal && (
        <div className="badge-modal-overlay" onClick={dismissBadge}>
          <div className="badge-modal" onClick={e => e.stopPropagation()}>
            <div className="badge-card">
              <span className="badge-icon">🏆</span>
              <h2>Badge Unlocked!</h2>
              <p>{badgeModal.name || badgeModal}</p>
              <button className="badge-close-btn" onClick={dismissBadge}>
                Claim Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level-up celebration modal */}
      {levelUpData && (
        <div className="level-up-modal-overlay" onClick={dismissLevelUp}>
          <div className="level-up-modal" onClick={e => e.stopPropagation()}>
            <span className="level-up-icon">🚀</span>
            <h2>Level Up!</h2>
            <p>You reached <strong>Level {levelUpData.newLevel}</strong> — keep defending the grid!</p>
            <button className="level-up-close-btn" onClick={dismissLevelUp}>
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
