import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Puzzle: drag rules into the correct firewall zone ────────────
const ALL_RULES = [
  { id: 1, text: 'Allow TCP 443 inbound (HTTPS)',   correct: 'dmz',      icon: '🔓' },
  { id: 2, text: 'Block TCP 23 everywhere (Telnet)', correct: 'block',    icon: '🚫' },
  { id: 3, text: 'Allow UDP 53 outbound (DNS)',      correct: 'internal', icon: '🌐' },
  { id: 4, text: 'Block ICMP from external',         correct: 'block',    icon: '🚫' },
  { id: 5, text: 'Allow TCP 80 inbound (HTTP)',      correct: 'dmz',      icon: '🔓' },
  { id: 6, text: 'Allow TCP 22 from admin subnet',   correct: 'internal', icon: '🔑' },
];

const ZONES = [
  { id: 'dmz',      label: 'DMZ Zone',        desc: 'Public-facing services',   color: 'var(--warning)' },
  { id: 'internal', label: 'Internal Zone',   desc: 'Internal network rules',   color: 'var(--accent)' },
  { id: 'block',    label: 'Block Zone',       desc: 'Deny-all rules',           color: 'var(--danger)' },
];

const NetworkDefensePuzzle = () => {
  const navigate  = useNavigate();
  const [placed,  setPlaced]  = useState({});   // { ruleId: zoneId }
  const [checked, setChecked] = useState(false);

  const drop = (ruleId, zoneId) => {
    setPlaced(p => ({ ...p, [ruleId]: zoneId }));
    setChecked(false);
  };

  const unplaced = ALL_RULES.filter(r => !placed[r.id]);
  const score    = ALL_RULES.filter(r => placed[r.id] === r.correct).length;
  const allDone  = Object.keys(placed).length === ALL_RULES.length;

  const { endGame } = useGame();
  const awardedRef  = useRef(false);

  // ── Award XP when puzzle is checked with a passing score ────────────
  useEffect(() => {
    if (!checked || score < 4 || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: 15 + score * 5, gameType: 'lab', badgeIds: ['lab_explorer'] });
  }, [checked, score]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-labs-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-labs')}>← Back to Cyber Labs</button>
        <div className="lab-shell">
          <span className="game-shell-icon">🧩</span>
          <h1 className="game-shell-title">Network Defense Puzzle</h1>
          <p className="game-shell-desc">
            Assign each firewall rule to the correct network zone. Click a rule then click a zone to place it.
          </p>

          {/* Unplaced rules */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
              color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
              Firewall Rules — drag to zone
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {unplaced.length === 0
                ? <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>All rules placed ✓</span>
                : unplaced.map(r => (
                    <RuleChip key={r.id} rule={r} onPlace={drop} zones={ZONES} />
                  ))
              }
            </div>
          </div>

          {/* Zones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {ZONES.map(z => {
              const zoneRules = ALL_RULES.filter(r => placed[r.id] === z.id);
              return (
                <div key={z.id} style={{ background: 'var(--surface)', border: `1px solid ${z.color}44`,
                  borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: `1px solid ${z.color}33`,
                    background: `${z.color}10` }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: z.color }}>{z.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{z.desc}</div>
                  </div>
                  <div style={{ padding: '10px 14px', minHeight: 80 }}>
                    {zoneRules.length === 0
                      ? <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No rules assigned</div>
                      : zoneRules.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                            fontSize: '0.78rem', color: checked ? (r.correct === z.id ? '#22c55e' : '#ef4444') : 'var(--text-secondary)' }}>
                            <span>{r.icon}</span>{r.text}
                            {checked && <span style={{ marginLeft: 'auto' }}>{r.correct === z.id ? '✓' : '✗'}</span>}
                          </div>
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {allDone && !checked && (
              <button className="game-card-btn" style={{ maxWidth: 180, justifyContent: 'center' }} onClick={() => setChecked(true)}>
                Check Answers
              </button>
            )}
            {checked && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
                  color: score === ALL_RULES.length ? '#22c55e' : 'var(--accent)', marginBottom: 8 }}>
                  {score}/{ALL_RULES.length} correct {score === ALL_RULES.length ? '🏆' : ''}
                </div>
                <button className="game-card-btn" style={{ maxWidth: 180, justifyContent: 'center' }}
                  onClick={() => { setPlaced({}); setChecked(false); }}>
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// ── Rule chip with zone picker ────────────────────────────────────
const RuleChip = ({ rule, onPlace, zones }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer',
          fontFamily: 'monospace' }}>
        <span>{rule.icon}</span>{rule.text}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 10, background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 8, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {zones.map(z => (
            <button key={z.id} onClick={() => { onPlace(rule.id, z.id); setOpen(false); }}
              style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none',
                border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                color: z.color, fontSize: '0.78rem', textAlign: 'left', fontFamily: 'var(--font-display)' }}>
              → {z.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkDefensePuzzle;
