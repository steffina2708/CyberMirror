import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Network topology ─────────────────────────────────────────────
const NODES = [
  { id: 'firewall', label: 'Firewall',     icon: '🔥', x: 50,  y: 12 },
  { id: 'server',   label: 'Web Server',   icon: '🖥️', x: 20,  y: 48 },
  { id: 'db',       label: 'Database',     icon: '🗄️', x: 80,  y: 48 },
  { id: 'pc1',      label: 'PC · Alice',   icon: '💻', x: 10,  y: 82 },
  { id: 'pc2',      label: 'PC · Bob',     icon: '💻', x: 35,  y: 82 },
  { id: 'pc3',      label: 'PC · Carol',   icon: '💻', x: 65,  y: 82 },
  { id: 'pc4',      label: 'PC · Dave',    icon: '💻', x: 90,  y: 82 },
];

const EDGES = [
  ['firewall', 'server'], ['firewall', 'db'],
  ['server',   'pc1'],    ['server',   'pc2'],
  ['db',       'pc3'],    ['db',       'pc4'],
];

// ── Attack types ──────────────────────────────────────────────────
const ATTACKS = [
  { type: 'ddos',      label: 'DDoS',          icon: '🌊', color: '#ef4444',
    defenses: [
      { label: 'Enable rate limiting',   correct: true,  pts: 25 },
      { label: 'Reboot the node',        correct: false, pts: -10 },
      { label: 'Block all traffic',      correct: false, pts: 5 },
      { label: 'Ignore it',              correct: false, pts: -20 },
    ]},
  { type: 'malware',   label: 'Malware',        icon: '🦠', color: '#f59e0b',
    defenses: [
      { label: 'Run antivirus scan',     correct: true,  pts: 25 },
      { label: 'Delete all files',       correct: false, pts: -15 },
      { label: 'Restart node',           correct: false, pts: -5 },
      { label: 'Disconnect cable',       correct: false, pts: 10 },
    ]},
  { type: 'phishing',  label: 'Phishing',       icon: '🎣', color: '#8b5cf6',
    defenses: [
      { label: 'Quarantine & alert user', correct: true, pts: 25 },
      { label: 'Reply to the email',      correct: false, pts: -20 },
      { label: 'Block sender IP',         correct: false, pts: 10 },
      { label: 'Monitor only',            correct: false, pts: -10 },
    ]},
  { type: 'bruteforce',label: 'Brute Force',    icon: '🔨', color: '#ec4899',
    defenses: [
      { label: 'Block IP + lock account', correct: true,  pts: 25 },
      { label: 'Increase login attempts', correct: false, pts: -20 },
      { label: 'Reset password only',     correct: false, pts: 5 },
      { label: 'Log & ignore',            correct: false, pts: -15 },
    ]},
  { type: 'exploit',   label: 'Zero-Day',       icon: '💣', color: '#dc2626',
    defenses: [
      { label: 'Patch server immediately', correct: true,  pts: 30 },
      { label: 'Wait for vendor patch',    correct: false, pts: -10 },
      { label: 'Disable the service',      correct: false, pts: 15 },
      { label: 'Reboot and hope',          correct: false, pts: -20 },
    ]},
];

const GAME_DURATION = 60;
const ATTACK_INTERVAL_MIN = 4000;
const ATTACK_INTERVAL_MAX = 7000;
const ATTACK_LIFETIME     = 6000;  // ms before an undefended attack damages the node

let _attackId = 0;
const newAttackId = () => ++_attackId;

// ── Main Component ────────────────────────────────────────────────
const NetworkDefender = () => {
  const navigate = useNavigate();
  const [phase,      setPhase]      = useState('briefing'); // briefing | playing | result
  const [timeLeft,   setTimeLeft]   = useState(GAME_DURATION);
  const [score,      setScore]      = useState(0);
  const [attacks,    setAttacks]    = useState([]);   // active attacks on nodes
  const [damaged,    setDamaged]    = useState([]);   // nodeIds that got hit
  const [selected,   setSelected]   = useState(null); // { attackId, nodeId, attack }
  const [log,        setLog]        = useState([]);
  const [defended,   setDefended]   = useState(0);
  const [missed,     setMissed]     = useState(0);

  const timerRef     = useRef(null);
  const spawnRef     = useRef(null);
  const lifetimeRefs = useRef({});
  const awardedRef   = useRef(false);

  const { endGame } = useGame();

  // ── Start game ─────────────────────────────────────────────────
  const startGame = useCallback(() => {
    awardedRef.current = false;
    setPhase('playing');
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setAttacks([]);
    setDamaged([]);
    setSelected(null);
    setLog([]);
    setDefended(0);
    setMissed(0);
  }, []);
  // ── Award XP when timer expires ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: Math.max(25, Math.min(60, Math.floor(score * 0.4))), gameType: 'game', badgeIds: ['network_defender'] });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase('result'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Spawn attacks ──────────────────────────────────────────────
  const spawnAttack = useCallback(() => {
    const node   = NODES[Math.floor(Math.random() * NODES.length)];
    const attack = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
    const id     = newAttackId();

    setAttacks(prev => {
      // one attack per node at a time
      if (prev.find(a => a.nodeId === node.id)) return prev;
      return [...prev, { id, nodeId: node.id, attack }];
    });

    // auto-expire after ATTACK_LIFETIME
    lifetimeRefs.current[id] = setTimeout(() => {
      setAttacks(prev => {
        const still = prev.find(a => a.id === id);
        if (still) {
          setDamaged(d => [...new Set([...d, node.id])]);
          setMissed(m => m + 1);
          setScore(s => Math.max(0, s - 15));
          setLog(l => [`❌ ${node.label} hit by ${attack.label}! -15 pts`, ...l].slice(0, 10));
        }
        return prev.filter(a => a.id !== id);
      });
    }, ATTACK_LIFETIME);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const schedule = () => {
      const delay = ATTACK_INTERVAL_MIN + Math.random() * (ATTACK_INTERVAL_MAX - ATTACK_INTERVAL_MIN);
      spawnRef.current = setTimeout(() => { spawnAttack(); schedule(); }, delay);
    };
    spawnAttack(); // first attack immediately
    schedule();
    return () => {
      clearTimeout(spawnRef.current);
      Object.values(lifetimeRefs.current).forEach(clearTimeout);
      lifetimeRefs.current = {};
    };
  }, [phase, spawnAttack]);

  // ── Cleanup on phase change ─────────────────────────────────────
  useEffect(() => {
    if (phase === 'result') {
      clearInterval(timerRef.current);
      clearTimeout(spawnRef.current);
      Object.values(lifetimeRefs.current).forEach(clearTimeout);
      lifetimeRefs.current = {};
    }
  }, [phase]);

  // ── Click attack node ───────────────────────────────────────────
  const clickAttack = useCallback((atk) => {
    setSelected(atk);
  }, []);

  // ── Choose defense ──────────────────────────────────────────────
  const chooseDefense = useCallback((defIdx) => {
    if (!selected) return;
    const def = selected.attack.defenses[defIdx];
    clearTimeout(lifetimeRefs.current[selected.id]);
    delete lifetimeRefs.current[selected.id];

    setAttacks(prev => prev.filter(a => a.id !== selected.id));
    setScore(s => Math.max(0, s + def.pts));
    if (def.correct) {
      setDefended(d => d + 1);
      setLog(l => [`✅ Defended ${selected.nodeId} from ${selected.attack.label}! +${def.pts} pts`, ...l].slice(0, 10));
    } else {
      setDamaged(d => [...new Set([...d, selected.nodeId])]);
      setMissed(m => m + 1);
      setLog(l => [`⚠️ Wrong response on ${selected.nodeId}: ${def.pts} pts`, ...l].slice(0, 10));
    }
    setSelected(null);
  }, [selected]);

  // ── Helpers ─────────────────────────────────────────────────────
  const attackOnNode = (nodeId) => attacks.find(a => a.nodeId === nodeId);
  const isDamaged    = (nodeId) => damaged.includes(nodeId);
  const timerPct     = (timeLeft / GAME_DURATION) * 100;
  const timerColor   = timeLeft > 20 ? '#22c55e' : timeLeft > 10 ? '#f59e0b' : '#ef4444';

  const totalAttempts = defended + missed;
  const accuracy      = totalAttempts > 0 ? Math.round((defended / totalAttempts) * 100) : 0;
  const grade         = score >= 180 ? { label: 'Network Legend',  icon: '🏆', color: '#22c55e'  }
                      : score >= 100 ? { label: 'Senior Defender', icon: '🥈', color: 'var(--accent)' }
                      : score >=  40 ? { label: 'Rookie Defender', icon: '🥉', color: '#f59e0b'  }
                      :                { label: 'Compromised',      icon: '💀', color: '#ef4444'  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-games-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-games')}>← Back to Cyber Games</button>

        {/* ── Briefing ─────────────────────────────────── */}
        {phase === 'briefing' && (
          <div className="game-shell" style={{ maxWidth: 620 }}>
            <span className="game-shell-icon">🌐</span>
            <h1 className="game-shell-title">Network Defender</h1>
            <p className="game-shell-desc">
              Your corporate network is under attack. Watch the topology for incoming threats,
              click the infected node, and deploy the correct defense before it's too late.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              {[
                ['⏱️', '60 seconds', 'Real-time countdown — act fast!'],
                ['💥', 'Attacks',    'DDoS, Malware, Phishing, Brute Force, Zero-Day'],
                ['🎯', 'Scoring',    '+25 pts correct · -10 to -20 for wrong/missed'],
                ['🛡️', 'Mechanic',  'Click a pulsing node → choose the right defense'],
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
            <button className="game-card-btn" style={{ justifyContent: 'center' }} onClick={startGame}>
              🚀 Launch Defense
            </button>
          </div>
        )}

        {/* ── Playing ──────────────────────────────────── */}
        {phase === 'playing' && (
          <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>
            {/* HUD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>Score</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent)' }}>{score}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%',
                  border: `4px solid ${timerColor}`, background: `${timerColor}15`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: timerColor === '#ef4444' ? `0 0 16px ${timerColor}66` : 'none',
                  transition: 'all 0.5s' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.2rem', color: timerColor }}>{timeLeft}</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>sec</div>
                </div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>Defended</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: '#22c55e' }}>{defended}</div>
              </div>
            </div>

            {/* Timer bar */}
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 4, transition: 'width 1s linear, background 0.5s' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
              {/* Network diagram */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, position: 'relative' }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: 260 }}>
                  {/* Edges */}
                  {EDGES.map(([a, b]) => {
                    const na = NODES.find(n => n.id === a);
                    const nb = NODES.find(n => n.id === b);
                    return (
                      <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                        stroke="var(--border)" strokeWidth="0.5" opacity="0.7" />
                    );
                  })}
                  {/* Nodes */}
                  {NODES.map(node => {
                    const atk       = attackOnNode(node.id);
                    const dmg       = isDamaged(node.id);
                    const isSelected = selected?.nodeId === node.id;
                    const ringColor  = atk ? atk.attack.color : dmg ? '#475569' : '#22c55e';
                    return (
                      <g key={node.id} style={{ cursor: atk ? 'pointer' : 'default' }}
                        onClick={() => atk && clickAttack(atk)}>
                        {/* Pulse ring for active attack */}
                        {atk && (
                          <circle cx={node.x} cy={node.y} r="7" fill="none"
                            stroke={atk.attack.color} strokeWidth="0.8" opacity="0.5"
                            style={{ animation: 'nodeAttackPulse 0.8s ease-in-out infinite alternate' }} />
                        )}
                        {/* Node circle */}
                        <circle cx={node.x} cy={node.y} r="5"
                          fill={isSelected ? '#1e3a5f' : dmg ? '#1c1c1c' : '#0f2340'}
                          stroke={ringColor} strokeWidth={atk ? '1.5' : '0.8'} />
                        {/* Icon */}
                        <text x={node.x} y={node.y + 1.2} textAnchor="middle" dominantBaseline="middle"
                          fontSize="4" style={{ userSelect: 'none' }}>
                          {node.icon}
                        </text>
                        {/* Label */}
                        <text x={node.x} y={node.y + 7.5} textAnchor="middle"
                          fontSize="2.5" fill="var(--text-dim)" style={{ userSelect: 'none' }}>
                          {node.label}
                        </text>
                        {/* Attack badge */}
                        {atk && (
                          <text x={node.x + 5} y={node.y - 5} textAnchor="middle"
                            fontSize="3.5" style={{ userSelect: 'none' }}>
                            {atk.attack.icon}
                          </text>
                        )}
                        {/* Damage badge */}
                        {dmg && !atk && (
                          <text x={node.x + 5} y={node.y - 5} textAnchor="middle"
                            fontSize="3" style={{ userSelect: 'none' }}>
                            💔
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>
                  Click a pulsing node to respond to the attack
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Defense picker */}
                {selected ? (
                  <div style={{ background: 'var(--card)', border: `1px solid ${selected.attack.color}55`, borderRadius: 10,
                    overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ padding: '10px 14px', background: `${selected.attack.color}12`,
                      borderBottom: `1px solid ${selected.attack.color}33` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{selected.attack.icon}</span>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
                            color: selected.attack.color }}>{selected.attack.label}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>on {selected.nodeId}</div>
                        </div>
                        <button onClick={() => setSelected(null)}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-dim)', fontSize: '1rem', lineHeight: 1 }}>×</button>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase',
                        fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 6 }}>Deploy defense:</div>
                      {selected.attack.defenses.map((d, i) => (
                        <button key={i} onClick={() => chooseDefense(i)}
                          style={{ display: 'block', width: '100%', marginBottom: 5, padding: '8px 10px',
                            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                            color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer',
                            textAlign: 'left', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = selected.attack.color; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.77rem', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🛡️</div>
                    Awaiting threat...<br />
                    <span style={{ fontSize: '0.65rem' }}>Attack nodes pulse red when under attack</span>
                  </div>
                )}

                {/* Activity log */}
                <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 10,
                  padding: '10px 12px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.6rem', color: '#00f5ff', fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Live Log</div>
                  {log.length === 0
                    ? <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace' }}>Monitoring network…</div>
                    : log.map((line, i) => (
                        <div key={i} style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace',
                          marginBottom: 3, lineHeight: 1.4 }}>{line}</div>
                      ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────── */}
        {phase === 'result' && (
          <div className="game-shell" style={{ maxWidth: 520 }}>
            <span style={{ fontSize: '2.8rem' }}>{grade.icon}</span>
            <h1 className="game-shell-title" style={{ color: grade.color }}>{grade.label}</h1>
            <p className="game-shell-desc">60-second defense complete. Here's your network health report.</p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{ width: 110, height: 110, borderRadius: '50%', border: `5px solid ${grade.color}`,
                boxShadow: `0 0 20px ${grade.color}44`, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: grade.color }}>{score}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>points</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[['🛡️ Defended', defended], ['💥 Missed', missed], ['🎯 Accuracy', `${accuracy}%`]].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 8px',
                  border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Compromised nodes */}
            {damaged.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>💔 Compromised nodes:</div>
                {damaged.map(id => {
                  const n = NODES.find(x => x.id === id);
                  return <div key={id}>{n?.icon} {n?.label}</div>;
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="game-card-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={startGame}>🔄 Play Again</button>
              <button className="game-back-btn" style={{ flex: 1 }} onClick={() => navigate('/cyber-games')}>← All Games</button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes nodeAttackPulse {
          from { r: 7; opacity: 0.5; }
          to   { r: 9; opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default NetworkDefender;
