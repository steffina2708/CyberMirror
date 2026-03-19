import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Simulated command database ───────────────────────────────────
const CMD_DB = {
  help: () => [
    '  Available commands:',
    '  nmap <target>      — Port scan a target',
    '  whois <domain>     — WHOIS lookup',
    '  ping <host>        — Ping a host',
    '  traceroute <host>  — Trace network route',
    '  ls                 — List directory',
    '  clear              — Clear terminal',
    '  help               — Show this help',
  ],
  ls: () => ['  Documents/  Downloads/  config.txt  .ssh/  secrets.enc'],
  'nmap 192.168.1.1': () => [
    '  Starting Nmap 7.94 ( https://nmap.org )',
    '  Nmap scan report for 192.168.1.1',
    '  PORT     STATE  SERVICE',
    '  22/tcp   open   ssh',
    '  80/tcp   open   http',
    '  443/tcp  open   https',
    '  3306/tcp closed mysql',
    '  Nmap done: 1 IP address scanned in 2.31 seconds',
  ],
  'whois cybermirror.io': () => [
    '  Domain: CYBERMIRROR.IO',
    '  Registrar: NameCheap, Inc.',
    '  Created: 2024-01-15',
    '  Expires: 2026-01-15',
    '  Name Servers: ns1.cybermirror.io, ns2.cybermirror.io',
  ],
  'ping google.com': () => [
    '  PING google.com (142.250.80.46)',
    '  64 bytes from 142.250.80.46: icmp_seq=1 ttl=57 time=12.4 ms',
    '  64 bytes from 142.250.80.46: icmp_seq=2 ttl=57 time=11.8 ms',
    '  64 bytes from 142.250.80.46: icmp_seq=3 ttl=57 time=12.1 ms',
  ],
};

const runCommand = (raw) => {
  const cmd = raw.trim().toLowerCase();
  if (cmd === 'clear') return null;           // signal to clear
  if (CMD_DB[cmd]) return CMD_DB[cmd]();
  if (cmd.startsWith('nmap '))   return ['  [scanning] ' + cmd.replace('nmap ','') + '...', '  No open ports found on that target.'];
  if (cmd.startsWith('whois '))  return ['  [querying] Registrar data not available for this domain.'];
  if (cmd.startsWith('ping '))   return ['  Request timeout for icmp_seq 0', '  Request timeout for icmp_seq 1'];
  if (cmd.startsWith('traceroute ')) return ['  traceroute: unknown host ' + cmd.replace('traceroute ','')];
  return [`  bash: ${raw}: command not found`];
};

const HackerSimulator = () => {
  const navigate = useNavigate();
  const [lines,   setLines]   = useState([[{ t: 'sys', v: 'CyberMirror Hacker Simulator v1.0 — Type `help` for commands' }]]);
  const [input,   setInput]   = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const outputRef   = useRef(null);
  const cmdCountRef = useRef(0);
  const awardedRef  = useRef(false);

  const { endGame } = useGame();

  const submit = useCallback((e) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    setHistory(h => [raw, ...h].slice(0, 50));
    setHistIdx(-1);
    setInput('');

    const result = runCommand(raw);
    if (result === null) { setLines([]); return; }

    setLines(prev => {
      const next = [...prev, [{ t: 'prompt', v: `root@cybermirror:~$ ${raw}` }]];
      result.forEach(r => next.push([{ t: 'out', v: r }]));
      return next;
    });

    // ── Award XP after the 3rd real command submitted ──────────────────
    cmdCountRef.current += 1;
    if (cmdCountRef.current >= 3 && !awardedRef.current) {
      awardedRef.current = true;
      endGame({ xp: 20, gameType: 'lab', badgeIds: ['lab_explorer'] });
    }

    setTimeout(() => {
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, 20);
  }, [input]);

  const keyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx(i => {
        const next = Math.min(i + 1, history.length - 1);
        setInput(history[next] ?? '');
        return next;
      });
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx(i => {
        const next = Math.max(i - 1, -1);
        setInput(next === -1 ? '' : history[next]);
        return next;
      });
    }
  }, [history]);

  const lineColor = (t) => {
    if (t === 'sys')    return '#4ade80';
    if (t === 'prompt') return 'var(--accent)';
    return 'var(--text-secondary)';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-labs-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-labs')}>← Back to Cyber Labs</button>
        <div className="lab-shell">
          <span className="game-shell-icon">💻</span>
          <h1 className="game-shell-title">Hacker Simulator</h1>
          <p className="game-shell-desc">Sandboxed terminal environment. No real systems are accessed.</p>

          {/* Terminal */}
          <div style={{ background: '#020617', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {/* Title bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0b1220', borderBottom: '1px solid #1e293b' }}>
              {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>root@cybermirror:~</span>
            </div>
            {/* Output */}
            <div ref={outputRef} style={{ padding: '14px 16px', height: 320, overflowY: 'auto', fontFamily: 'Courier New, monospace', fontSize: '0.82rem', lineHeight: 1.7 }}>
              {lines.map((row, i) => row.map((seg, j) => (
                <div key={`${i}-${j}`} style={{ color: lineColor(seg.t) }}>{seg.v}</div>
              )))}
            </div>
            {/* Input */}
            <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid #1e293b', background: '#0b1220', gap: 8 }}>
              <span style={{ color: '#00f5ff', fontFamily: 'monospace', fontSize: '0.85rem', flexShrink: 0 }}>root@cybermirror:~$</span>
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={keyDown}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.85rem', caretColor: '#00f5ff' }}
              />
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HackerSimulator;
