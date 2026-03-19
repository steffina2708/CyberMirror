import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useGame } from '../../context/GameContext';
import api from '../../services/api';
import '../../styles/digitaltwin.css';

/* ═══════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════ */
const DURATION = 60;

const NODES = [
  { id: 'router',  label: 'Router',       icon: '⬡',  x: 50,  y: 5,  type: 'network'  },
  { id: 'fw',      label: 'Firewall',      icon: '🛡',  x: 50,  y: 22, type: 'security' },
  { id: 'web',     label: 'Web Server',    icon: '🌐', x: 16,  y: 45, type: 'server'   },
  { id: 'db',      label: 'Database',      icon: '🗄',  x: 50,  y: 47, type: 'server'   },
  { id: 'email',   label: 'Email Server',  icon: '📧', x: 84,  y: 45, type: 'server'   },
  { id: 'pc1',     label: 'PC-1',          icon: '💻', x: 18,  y: 73, type: 'endpoint' },
  { id: 'pc2',     label: 'PC-2',          icon: '💻', x: 50,  y: 78, type: 'endpoint' },
  { id: 'pc3',     label: 'PC-3',          icon: '💻', x: 82,  y: 73, type: 'endpoint' },
];

const EDGES = [
  ['router', 'fw'],
  ['fw', 'web'], ['fw', 'db'], ['fw', 'email'],
  ['db', 'pc1'], ['db', 'pc2'], ['db', 'pc3'],
  ['email', 'pc1'], ['email', 'pc2'], ['email', 'pc3'],
  ['web', 'pc1'],
];

const ACTIONS = [
  { id: 'block_ip',          label: '🚫 Block IP Address',    desc: 'Block the source IP at perimeter'     },
  { id: 'disconnect',        label: '🔌 Disconnect Device',   desc: 'Isolate the device from the network'  },
  { id: 'run_antivirus',     label: '🔍 Run Antivirus Scan',  desc: 'Full malware scan on the system'      },
  { id: 'enable_firewall',   label: '🛡 Enable Firewall Rule',desc: 'Deploy a custom rule for this threat' },
  { id: 'reset_credentials', label: '🔑 Reset Credentials',   desc: 'Force password reset on accounts'    },
  { id: 'patch_server',      label: '🔧 Patch Vulnerability', desc: 'Apply security patch to close exploit'},
];

const ATTACKS = [
  {
    id: 'phishing', name: 'Phishing Attack', icon: '🎣', color: '#f59e0b',
    targets: ['email','pc1','pc2','pc3'],
    desc: t => `Phishing campaign targeting ${t} — suspicious link detected in email`,
    correct: ['block_ip','reset_credentials'],
    expl: {
      block_ip:          '✅ Blocking the sender IP stops the phishing campaign at the perimeter.',
      reset_credentials: '✅ Resetting credentials invalidates any stolen login data.',
      disconnect:        '⚠️ Disconnecting helps contain spread but doesn\'t stop the phishing source.',
      run_antivirus:     '❌ Antivirus won\'t stop a phishing campaign. Block the IP or reset credentials.',
      enable_firewall:   '⚠️ WAF rules can filter phishing domains, but credential reset is the priority.',
      patch_server:      '❌ Patching doesn\'t address active phishing. Focus on source IP and credentials.',
    },
  },
  {
    id: 'malware', name: 'Malware Infection', icon: '🦠', color: '#ef4444',
    targets: ['pc1','pc2','pc3','web'],
    desc: t => `Malware infection detected on ${t} — spreading through shared drives`,
    correct: ['disconnect','run_antivirus'],
    expl: {
      block_ip:          '❌ Blocking an IP won\'t remove malware already running on the endpoint.',
      disconnect:        '✅ Disconnecting the infected device immediately stops lateral spread.',
      run_antivirus:     '✅ A full antivirus scan identifies and quarantines the malware payload.',
      enable_firewall:   '⚠️ Firewall rules help, but the infected device must be isolated first.',
      reset_credentials: '❌ Credentials aren\'t the issue here — isolate and scan the device.',
      patch_server:      '⚠️ Patching prevents re-infection but doesn\'t remove active malware.',
    },
  },
  {
    id: 'ddos', name: 'DDoS Attack', icon: '🌊', color: '#3b82f6',
    targets: ['web','fw','router'],
    desc: t => `DDoS flood on ${t} — ${(Math.random()*8+2).toFixed(1)} Gbps of malicious traffic`,
    correct: ['block_ip','enable_firewall'],
    expl: {
      block_ip:          '✅ Blocking source IP ranges mitigates the DDoS flood at the perimeter.',
      disconnect:        '❌ Disconnecting the server takes it offline — the attacker wins.',
      run_antivirus:     '❌ Antivirus won\'t stop volumetric DDoS traffic. Filter at the firewall.',
      enable_firewall:   '✅ Firewall rate-limiting rules effectively block DDoS traffic patterns.',
      reset_credentials: '❌ DDoS is a network flood, not a credential attack.',
      patch_server:      '❌ Patching won\'t stop an active DDoS. Enable firewall filtering now.',
    },
  },
  {
    id: 'bruteforce', name: 'Brute Force Login', icon: '🔨', color: '#a855f7',
    targets: ['db','web','fw'],
    desc: t => `Brute force attack on ${t} — ${Math.floor(Math.random()*400+100)} attempts/min`,
    correct: ['block_ip','reset_credentials'],
    expl: {
      block_ip:          '✅ Blocking the attacker\'s IP stops the brute force attempts immediately.',
      disconnect:        '⚠️ Disconnecting takes the service offline — better to block the source IP.',
      run_antivirus:     '❌ Antivirus doesn\'t address network-based brute force attacks.',
      enable_firewall:   '⚠️ Rate-limiting helps, but blocking the source IP is more effective.',
      reset_credentials: '✅ Resetting credentials invalidates any passwords the attacker may have found.',
      patch_server:      '❌ Brute force exploits weak passwords, not software vulnerabilities.',
    },
  },
  {
    id: 'ransomware', name: 'Ransomware Attack', icon: '💰', color: '#f97316',
    targets: ['pc1','pc2','pc3','db'],
    desc: t => `Ransomware encrypting files on ${t} — spreading laterally`,
    correct: ['disconnect','patch_server'],
    expl: {
      block_ip:          '⚠️ May slow spread but ransomware is already inside — isolate the device.',
      disconnect:        '✅ Immediately disconnecting prevents the ransomware from encrypting more files.',
      run_antivirus:     '⚠️ Antivirus may detect it, but disconnection is the immediate priority.',
      enable_firewall:   '⚠️ Firewall helps prevent spread, but the device needs isolation first.',
      reset_credentials: '❌ Credential reset won\'t stop active file encryption.',
      patch_server:      '✅ Patching the exploited vulnerability prevents ransomware re-entry.',
    },
  },
  {
    id: 'sqli', name: 'SQL Injection', icon: '💉', color: '#10b981',
    targets: ['db','web'],
    desc: t => `SQL injection detected on ${t} — unauthorized database query executed`,
    correct: ['patch_server','enable_firewall'],
    expl: {
      block_ip:          '⚠️ Blocks this attacker, but the vulnerability still exists for others.',
      disconnect:        '❌ Taking the database offline disrupts operations. Patch the flaw instead.',
      run_antivirus:     '❌ SQL injection is a web vulnerability, not a malware issue.',
      enable_firewall:   '✅ A Web Application Firewall detects and blocks SQL injection patterns.',
      reset_credentials: '⚠️ Reset if data was stolen, but patch the injection vulnerability first.',
      patch_server:      '✅ Patching the SQL injection flaw stops further exploitation.',
    },
  },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const initNodeStates = () =>
  Object.fromEntries(NODES.map(n => [n.id, 'normal']));

const pickOptions = (attack) => {
  const correct = ACTIONS.filter(a => attack.correct.includes(a.id));
  const wrong   = ACTIONS.filter(a => !attack.correct.includes(a.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 4 - correct.length);
  return [...correct, ...wrong].sort(() => Math.random() - 0.5);
};

const threatColor = (t) => {
  if (t >= 75) return '#ef4444';
  if (t >= 40) return '#f97316';
  return '#22c55e';
};

/* ═══════════════════════════════════════════════════════════
   BRIEF SCREEN
═══════════════════════════════════════════════════════════ */
const BriefScreen = ({ onStart }) => (
  <div className="dt-brief">
    <div className="dt-brief-badge">🏢 DIGITAL TWIN SIMULATOR</div>
    <h1 className="dt-brief-title">
      Virtual Company Network<br />
      <span className="dt-brief-accent">Under Cyber Attack</span>
    </h1>
    <p className="dt-brief-desc">
      You are the SOC analyst responsible for a simulated corporate network.
      Cyber attacks will occur in real time — you must identify each threat
      and choose the correct defensive response before systems are compromised.
    </p>

    <div className="dt-brief-cards">
      {[
        { icon: '🌐', title: '8 Network Nodes',   sub: 'Router, Firewall, Servers, Workstations' },
        { icon: '⚔️',  title: '6 Attack Types',   sub: 'Phishing, Malware, DDoS, Ransomware…'    },
        { icon: '⏱',  title: '60-Second Window',  sub: 'Respond fast for bonus XP'               },
        { icon: '🏆',  title: 'XP + Badges',       sub: 'Earn up to 40 XP per correct response'   },
      ].map(c => (
        <div key={c.title} className="dt-brief-card">
          <span className="dt-brief-card-icon">{c.icon}</span>
          <strong>{c.title}</strong>
          <span>{c.sub}</span>
        </div>
      ))}
    </div>

    <button className="dt-btn dt-btn--primary dt-brief-btn" onClick={onStart}>
      ⚡ Deploy Network Simulation
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   NETWORK MAP
═══════════════════════════════════════════════════════════ */
const NetworkMap = ({ nodeStates, activeAttack }) => {
  const alertNodeId = activeAttack?.target?.id;

  return (
    <div className="dt-net">
      {/* SVG connection lines */}
      <svg className="dt-net-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {EDGES.map(([a, b]) => {
          const na = NODES.find(n => n.id === a);
          const nb = NODES.find(n => n.id === b);
          const isAlert = alertNodeId === a || alertNodeId === b;
          const isCompromised =
            nodeStates[a] === 'compromised' || nodeStates[b] === 'compromised';
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              className={`dt-edge${isAlert ? ' dt-edge--alert' : ''}${isCompromised ? ' dt-edge--compromised' : ''}`}
              filter="url(#glow)"
            />
          );
        })}
      </svg>

      {/* Node divs */}
      {NODES.map(node => {
        const state = nodeStates[node.id] || 'normal';
        const isTarget = alertNodeId === node.id;
        return (
          <div
            key={node.id}
            className={`dt-node dt-node--${state}${isTarget ? ' dt-node--target' : ''} dt-node--${node.type}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="dt-node-icon">{node.icon}</div>
            <div className="dt-node-label">{node.label}</div>
            {isTarget && <div className="dt-node-alert-ring" />}
            {state === 'warning'     && <div className="dt-node-pulse dt-node-pulse--warn" />}
            {state === 'compromised' && <div className="dt-node-pulse dt-node-pulse--crit" />}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ATTACK PANEL
═══════════════════════════════════════════════════════════ */
const AttackPanel = ({ activeAttack, options, onAction, log, feedback }) => {
  if (feedback) {
    return (
      <div className={`dt-panel dt-panel--feedback${feedback.correct ? ' dt-panel--ok' : ' dt-panel--fail'}`}>
        <div className="dt-feedback-icon">{feedback.correct ? '✅' : '❌'}</div>
        <p className="dt-feedback-text">{feedback.text}</p>
        {feedback.correct && (
          <div className="dt-feedback-xp">
            +{feedback.xp} XP{feedback.fast ? '  ⚡ Fast Response Bonus!' : ''}
          </div>
        )}
        {!feedback.correct && (
          <div className="dt-feedback-xp dt-feedback-xp--minor">+{feedback.xp} XP (learning reward)</div>
        )}
      </div>
    );
  }

  if (!activeAttack) {
    return (
      <div className="dt-panel dt-panel--idle">
        <div className="dt-panel-idle-icon">🔍</div>
        <p className="dt-panel-idle-title">Monitoring Network…</p>
        <p className="dt-panel-idle-sub">All systems nominal. Standby for threats.</p>
        {log.length > 0 && (
          <div className="dt-mini-log">
            {log.slice(-4).reverse().map((e, i) => (
              <div key={i} className={`dt-mini-log-row${e.correct ? '' : ' dt-mini-log-row--fail'}`}>
                {e.icon} <span>{e.target}</span> — {e.action}
                <span className="dt-mini-xp">+{e.xp}XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { atk, target } = activeAttack;
  return (
    <div className="dt-panel dt-panel--attack" style={{ '--atk-color': atk.color }}>
      <div className="dt-attack-header">
        <span className="dt-attack-icon">{atk.icon}</span>
        <div>
          <div className="dt-attack-name">{atk.name}</div>
          <div className="dt-attack-target">⚠ {atk.desc(target.label)}</div>
        </div>
      </div>
      <p className="dt-action-prompt">Select your defensive response:</p>
      <div className="dt-actions-grid">
        {options.map(action => (
          <button key={action.id} className="dt-action-btn" onClick={() => onAction(action)}>
            <span className="dt-action-label">{action.label}</span>
            <span className="dt-action-desc">{action.desc}</span>
          </button>
        ))}
      </div>
      <p className="dt-action-hint">⚡ Respond within 5 seconds for a fast-response bonus!</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   RESULTS SCREEN
═══════════════════════════════════════════════════════════ */
const ResultsScreen = ({ score, log, threat, onPlay, onExit }) => {
  const correct = log.filter(e => e.correct).length;
  const total   = log.length;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade   = pct >= 80 ? 'S' : pct >= 60 ? 'A' : pct >= 40 ? 'B' : pct >= 20 ? 'C' : 'D';
  const gradeColor = grade === 'S' ? '#fbbf24' : grade === 'A' ? '#22c55e' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f97316' : '#ef4444';

  return (
    <div className="dt-results">
      <div className="dt-results-badge">SIMULATION COMPLETE</div>
      <div className="dt-results-grade" style={{ color: gradeColor }}>
        Grade: {grade}
      </div>
      <div className="dt-results-score">{score} XP Earned</div>

      <div className="dt-results-stats">
        {[
          { label: 'Threats Handled',   value: total,           color: 'var(--accent)' },
          { label: 'Correct Responses', value: correct,         color: '#22c55e' },
          { label: 'Accuracy',          value: `${pct}%`,       color: '#3b82f6' },
          { label: 'Final Threat Lvl',  value: `${threat}%`,    color: threat > 60 ? '#ef4444' : '#f97316' },
        ].map(s => (
          <div key={s.label} className="dt-result-stat">
            <div className="dt-result-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="dt-result-stat-lab">{s.label}</div>
          </div>
        ))}
      </div>

      {log.length > 0 && (
        <div className="dt-results-log">
          <div className="dt-results-log-title">Response History</div>
          <div className="dt-results-log-list">
            {log.map((e, i) => (
              <div key={i} className={`dt-log-row${e.correct ? ' dt-log-row--ok' : ' dt-log-row--fail'}`}>
                <span className="dt-log-icon">{e.icon}</span>
                <span className="dt-log-target">{e.target}</span>
                <span className="dt-log-action">{e.action}</span>
                <span className="dt-log-xp">+{e.xp}XP</span>
                <span className="dt-log-status">{e.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dt-results-buttons">
        <button className="dt-btn dt-btn--primary" onClick={onPlay}>🔄 Play Again</button>
        <button className="dt-btn dt-btn--ghost"   onClick={onExit}>← Exit to Games</button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const DigitalTwinSimulator = () => {
  const navigate = useNavigate();
  const { endGame } = useGame();

  /* ── State ─────────────────────────────────────────────── */
  const [phase,       setPhase]       = useState('brief');   // brief|running|results
  const [nodeStates,  setNodeStates]  = useState(initNodeStates);
  const [activeAttack,setActiveAttack]= useState(null);      // { atk, target }
  const [options,     setOptions]     = useState([]);
  const [timer,       setTimer]       = useState(DURATION);
  const [score,       setScore]       = useState(0);
  const [threat,      setThreat]      = useState(0);
  const [feedback,    setFeedback]    = useState(null);
  const [log,         setLog]         = useState([]);

  /* ── Refs for callbacks ─────────────────────────────────── */
  const scoreRef    = useRef(0);
  const threatRef   = useRef(0);
  const autoDmgRef  = useRef(null);
  const fbTimerRef  = useRef(null);
  const phaseRef    = useRef('brief');

  const syncScore  = v => { scoreRef.current  = v; };
  const syncThreat = v => { threatRef.current = v; };

  const updScore = useCallback(fn => {
    setScore(prev => { const n = typeof fn === 'function' ? fn(prev) : fn; syncScore(n); return n; });
  }, []);
  const updThreat = useCallback(fn => {
    setThreat(prev => { const n = typeof fn === 'function' ? fn(prev) : fn; syncThreat(n); return n; });
  }, []);

  /* ── Finish game ────────────────────────────────────────── */
  const finishGame = useCallback(() => {
    phaseRef.current = 'results';
    clearTimeout(autoDmgRef.current);
    clearTimeout(fbTimerRef.current);
    setPhase('results');

    endGame({
      xp:        scoreRef.current,
      gameType:  'game',
      badgeIds:  scoreRef.current >= 100 ? ['network_defender'] : [],
    });

    /* Persist to backend silently */
    api.post('/digital-twin/save', {
      simulationScore:  scoreRef.current,
      xpEarned:         scoreRef.current,
      finalThreatLevel: threatRef.current,
    }).catch(() => {});
  }, [endGame]);

  /* ── Timer countdown ────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'running') return;
    if (timer <= 0) { finishGame(); return; }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timer, finishGame]);

  /* ── Spawn attacks when idle and running ────────────────── */
  const spawnAttack = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    const atk    = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
    const node   = NODES.find(n => n.id === atk.targets[Math.floor(Math.random() * atk.targets.length)]);
    const opts   = pickOptions(atk);
    const atkStart = Date.now();

    setActiveAttack({ atk, target: node, startedAt: atkStart });
    setOptions(opts);
    setNodeStates(prev => ({ ...prev, [node.id]: 'warning' }));

    /* Auto-damage: no response within 10 seconds */
    clearTimeout(autoDmgRef.current);
    autoDmgRef.current = setTimeout(() => {
      setActiveAttack(curr => {
        if (!curr) return null;
        setNodeStates(prev => ({ ...prev, [curr.target.id]: 'compromised' }));
        updThreat(t => Math.min(100, t + 30));
        setLog(l => [
          ...l,
          { icon: curr.atk.icon, target: curr.target.label, action: '⏱ No response', correct: false, xp: 0 },
        ]);
        return null;
      });
    }, 10_000);
  }, [updThreat]);

  useEffect(() => {
    if (phase !== 'running' || activeAttack !== null || feedback !== null) return;
    const delay = 4_000 + Math.random() * 6_000;
    const t = setTimeout(spawnAttack, delay);
    return () => clearTimeout(t);
  }, [phase, activeAttack, feedback, spawnAttack]);

  /* ── Handle response action ─────────────────────────────── */
  const handleAction = useCallback(action => {
    if (!activeAttack) return;
    clearTimeout(autoDmgRef.current);

    const { atk, target, startedAt } = activeAttack;
    const correct = atk.correct.includes(action.id);
    const fast    = (Date.now() - startedAt) < 5_000;
    const xp      = correct ? (fast ? 40 : 30) : 5;
    const text    = atk.expl[action.id] ?? (correct ? '✅ Good choice!' : '❌ Not the optimal response here.');

    updScore(s  => s + xp);
    updThreat(t => correct ? Math.max(0, t - 10) : Math.min(100, t + 20));
    setNodeStates(prev => ({ ...prev, [target.id]: correct ? 'normal' : 'compromised' }));
    setActiveAttack(null);
    setFeedback({ text, correct, xp, fast: correct && fast });
    setLog(l => [
      ...l.slice(-19),
      { icon: atk.icon, target: target.label, action: action.label, correct, xp },
    ]);

    clearTimeout(fbTimerRef.current);
    fbTimerRef.current = setTimeout(() => setFeedback(null), 3_500);
  }, [activeAttack, updScore, updThreat]);

  /* ── Start / Restart ────────────────────────────────────── */
  const handleStart = useCallback(() => {
    clearTimeout(autoDmgRef.current);
    clearTimeout(fbTimerRef.current);
    syncScore(0); syncThreat(0);
    phaseRef.current = 'running';

    setPhase('running');
    setNodeStates(initNodeStates());
    setTimer(DURATION);
    setScore(0);
    setThreat(0);
    setActiveAttack(null);
    setOptions([]);
    setFeedback(null);
    setLog([]);
  }, []);

  /* ── Cleanup on unmount ─────────────────────────────────── */
  useEffect(() => () => {
    clearTimeout(autoDmgRef.current);
    clearTimeout(fbTimerRef.current);
  }, []);

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  if (phase === 'brief')   return <div className="dt-page"><BriefScreen onStart={handleStart} /></div>;
  if (phase === 'results') return (
    <div className="dt-page">
      <ResultsScreen score={score} log={log} threat={threat} onPlay={handleStart} onExit={() => navigate('/cyber-games')} />
    </div>
  );

  /* Running phase */
  const timerPct   = (timer / DURATION) * 100;
  const timerColor = timer <= 10 ? '#ef4444' : timer <= 20 ? '#f97316' : '#22c55e';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main dt-running-main">

        {/* ── Status bar ──────────────────────────────────── */}
        <div className="dt-status-bar">
          {/* Timer */}
          <div className="dt-status-group">
            <span className="dt-status-label">TIME</span>
            <span className="dt-status-val" style={{ color: timerColor }}>
              {String(Math.floor(timer / 60)).padStart(2,'0')}:{String(timer % 60).padStart(2,'0')}
            </span>
            <div className="dt-status-sub-bar">
              <div className="dt-status-sub-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
            </div>
          </div>

          {/* Score */}
          <div className="dt-status-group">
            <span className="dt-status-label">SCORE</span>
            <span className="dt-status-val" style={{ color: 'var(--accent)' }}>{score}</span>
            <span className="dt-status-unit">XP</span>
          </div>

          {/* Threat Level */}
          <div className="dt-status-group">
            <span className="dt-status-label">THREAT LEVEL</span>
            <span className="dt-status-val" style={{ color: threatColor(threat) }}>{threat}%</span>
            <div className="dt-status-sub-bar">
              <div className="dt-status-sub-fill" style={{ width: `${threat}%`, background: threatColor(threat) }} />
            </div>
          </div>

          {/* Responses */}
          <div className="dt-status-group">
            <span className="dt-status-label">RESPONSES</span>
            <span className="dt-status-val">{log.length}</span>
            <span className="dt-status-unit" style={{ color: '#22c55e' }}>{log.filter(e => e.correct).length} ✓</span>
          </div>
        </div>

        {/* ── Main game layout ────────────────────────────── */}
        <div className="dt-game-layout">

          {/* Network diagram (left) */}
          <div className="dt-game-left">
            <div className="dt-section-title">
              <span className="dt-dot" />  Company Network Infrastructure
            </div>
            <NetworkMap nodeStates={nodeStates} activeAttack={activeAttack} />

            {/* Legend */}
            <div className="dt-legend">
              {[
                { cls: 'normal',      label: 'Operational' },
                { cls: 'warning',     label: 'Under Attack' },
                { cls: 'compromised', label: 'Compromised'  },
              ].map(l => (
                <div key={l.cls} className="dt-legend-item">
                  <span className={`dt-legend-dot dt-legend-dot--${l.cls}`} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Attack panel (right) */}
          <div className="dt-game-right">
            <div className="dt-section-title">
              <span className="dt-dot dt-dot--red" />  Incident Response Console
            </div>
            <AttackPanel
              activeAttack={activeAttack}
              options={options}
              onAction={handleAction}
              log={log}
              feedback={feedback}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default DigitalTwinSimulator;
