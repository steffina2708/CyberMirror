import React from 'react';

const ProgressBar = ({ current, total }) => {
  const pct = (current / total) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.7rem', color: 'var(--text-dim)',
        fontFamily: 'var(--font-display)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        <span>Progress</span>
        <span>{current} / {total} Steps</span>
      </div>
      <div style={{
        height: 4, background: '#0f2a3d', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--cyan), var(--magenta))',
          transition: 'width 0.4s ease',
          boxShadow: '0 0 8px var(--cyan-glow)',
        }} />
      </div>
    </div>
  );
};

export default ProgressBar;
