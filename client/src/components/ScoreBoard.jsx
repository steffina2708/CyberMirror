import React from 'react';

const ScoreBoard = ({ score, maxScore, correctCount, totalSteps }) => {
  const pct = Math.round((score / maxScore) * 100);
  return (
    <div style={{
      display: 'flex', gap: 16, flexWrap: 'wrap',
      padding: '12px 0', marginBottom: 8,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cyan)' }}>{score}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Score</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--green)' }}>
          {correctCount}/{totalSteps}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Correct</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--yellow)' }}>{pct}%</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Accuracy</div>
      </div>
    </div>
  );
};

export default ScoreBoard;
