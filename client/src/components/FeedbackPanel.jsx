import React from 'react';

const FeedbackPanel = ({ isCorrect, explanation, pointsEarned }) => {
  return (
    <div className={`feedback-panel ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
      <div className="feedback-title" style={{ color: isCorrect ? 'var(--green)' : 'var(--red)' }}>
        {isCorrect ? '✓ Correct! ' : '✗ Incorrect — '}
        {isCorrect ? `+${pointsEarned} points` : 'No points earned'}
      </div>
      <div className="feedback-text">{explanation}</div>
    </div>
  );
};

export default FeedbackPanel;
