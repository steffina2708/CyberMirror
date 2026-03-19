import React from 'react';

const DecisionPanel = ({ choices, onChoice, selectedIndex, correctIndex, showFeedback }) => {
  if (!choices || choices.length === 0) {
    return (
      <div className="decision-panel">
        <div style={{ color: 'var(--text-dim)', padding: '20px 0', fontSize: '0.85rem' }}>
          No choices available for this step.
        </div>
      </div>
    );
  }

  const getChoiceClass = (i) => {
    if (!showFeedback) return '';
    if (i === selectedIndex) {
      return i === correctIndex ? 'selected-correct' : 'selected-wrong';
    }
    if (i === correctIndex && showFeedback) return 'show-correct';
    return '';
  };

  return (
    <div className="decision-panel">
      <div className="decision-title">⚡ What do you do?</div>
      <div className="choices-list">
        {choices.map((choice, i) => (
          <button
            key={i}
            className={`choice-btn ${getChoiceClass(i)}`}
            onClick={() => !showFeedback && onChoice(i)}
            disabled={showFeedback}
          >
            <span className="choice-index">{String.fromCharCode(65 + i)}</span>
            <span>{choice.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DecisionPanel;
