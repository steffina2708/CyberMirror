import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════════════
   CYBEREFFECTS — visual ambient effects, always rendered
   Theme changes COLORS only — not component presence.
   Exports: ThreatMonitor · TerminalText · CyberParticles
   ═══════════════════════════════════════════════════════════════════ */

// ── Threat log entries pool ──────────────────────────────────────
const THREATS = [
  { level: 'BLOCKED', msg: 'Phishing payload from 203.0.113.42',           },
  { level: 'ALERT',   msg: 'SSH brute-force: 47 attempts detected',         },
  { level: 'BLOCKED', msg: 'SQL injection probe via Tor exit node',         },
  { level: 'INFO',    msg: 'SSL cert verified: secure-bank.example.com',    },
  { level: 'ALERT',   msg: 'Credential stuffing on /api/auth/login',        },
  { level: 'BLOCKED', msg: 'Malicious JS payload in search form',           },
  { level: 'INFO',    msg: 'MFA challenge issued: admin@corp.local',        },
  { level: 'ALERT',   msg: 'Suspicious download flagged: install.exe',      },
  { level: 'BLOCKED', msg: 'DNS spoofing attempt intercepted',               },
  { level: 'INFO',    msg: 'VPN tunnel secured: 10.0.0.12 ↔ HQ',           },
  { level: 'ALERT',   msg: 'Port scan from 198.51.100.7 detected',          },
  { level: 'BLOCKED', msg: 'XSS attempt blocked in comment field',          },
  { level: 'INFO',    msg: 'Firewall rules hot-reloaded: 2,048 rules',      },
  { level: 'ALERT',   msg: 'Anomalous outbound traffic: 192.168.2.88',      },
  { level: 'BLOCKED', msg: 'CSRF token mismatch — request rejected',        },
];

const levelClassName = { BLOCKED: 'threat-level threat-level-blocked', ALERT: 'threat-level threat-level-alert', INFO: 'threat-level threat-level-info' };

function nowTime() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ── 1. Live Threat Monitor ───────────────────────────────────────
export function ThreatMonitor() {
  const [log, setLog] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      ...THREATS[i],
      time: nowTime(),
      uid: i,
    }))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      const entry = THREATS[Math.floor(Math.random() * THREATS.length)];
      setLog(prev => [{ ...entry, time: nowTime(), uid: Date.now() }, ...prev.slice(0, 4)]);
    }, 2600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="threat-monitor">
      <div className="threat-monitor-header">
        <span className="threat-dot" />
        <span className="threat-title">⚡ LIVE THREAT MONITOR</span>
        <span className="threat-status-badge">ACTIVE</span>
      </div>
      <div className="threat-log">
        {log.map(entry => (
          <div key={entry.uid} className="threat-entry">
            <span className="threat-time">{entry.time}</span>
            <span className={levelClassName[entry.level]}>{entry.level}</span>
            <span className="threat-msg">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Terminal Typewriter ───────────────────────────────────────
const TERMINAL_MSGS = [
  '// Scanning network perimeter...',
  '// Analyzing threat vectors...',
  '// Deep packet inspection active',
  '// Zero-day signatures updated',
  '// Monitoring active sessions...',
  '// Firewall rules synchronized',
  '// Anomaly detection: RUNNING',
  '// Intrusion detection: ONLINE',
];

export function TerminalText() {
  const [displayed, setDisplayed] = useState('');
  const [msgIdx, setMsgIdx]       = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [erasing, setErasing]     = useState(false);

  useEffect(() => {
    const target = TERMINAL_MSGS[msgIdx];

    if (!erasing) {
      if (charIdx < target.length) {
        const t = setTimeout(() => {
          setDisplayed(target.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        }, 42);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setErasing(true), 2400);
      return () => clearTimeout(t);
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setDisplayed(target.slice(0, charIdx - 1));
          setCharIdx(c => c - 1);
        }, 20);
        return () => clearTimeout(t);
      }
      setErasing(false);
      setMsgIdx(i => (i + 1) % TERMINAL_MSGS.length);
    }
  }, [charIdx, erasing, msgIdx]);

  return (
    <span className="terminal-text">
      {displayed}
      <span className="terminal-cursor">_</span>
    </span>
  );
}

// ── 3. Particle canvas ───────────────────────────────────────────
export function CyberParticles() {
  const { theme } = useTheme();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    // Colors based on current theme
    const isDark    = theme === 'dark';
    const dotColor  = isDark ? 'rgba(0,245,255,0.50)'   : 'rgba(79,70,229,0.40)';
    const edgeRgb   = isDark ? '0,245,255'              : '79,70,229';
    const edgeAlpha = isDark ? 0.10                     : 0.08;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const COUNT = 42;
    const pts = Array.from({ length: COUNT }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r:  Math.random() * 1.4 + 0.4,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // edges
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 115) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${edgeRgb},${edgeAlpha * (1 - d / 115)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // dots
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      animId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="cyber-particles" />;
}
