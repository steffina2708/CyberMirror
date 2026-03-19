import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/games.css';

// ── Simulated evidence files ─────────────────────────────────────
const EVIDENCE = [
  {
    id: 'auth.log',
    icon: '📄',
    label: 'auth.log',
    type: 'System Log',
    content: `Mar 04 02:14:33 server sshd[1024]: Failed password for root from 185.220.101.45 port 52134
Mar 04 02:14:36 server sshd[1024]: Failed password for root from 185.220.101.45 port 52134
Mar 04 02:14:41 server sshd[1024]: Accepted password for admin from 185.220.101.45 port 52135
Mar 04 02:15:02 server sudo: admin : command: /bin/bash
Mar 04 02:16:18 server sshd[1025]: session opened for user root by admin`,
    findings: ['Brute-force attempt from 185.220.101.45', 'Successful login after 2 failed attempts', 'Privilege escalation to root'],
  },
  {
    id: 'network.pcap',
    icon: '🌐',
    label: 'network.pcap',
    type: 'Packet Capture',
    content: `Frame 1:  192.168.1.10 → 185.220.101.45  TCP SYN
Frame 2:  185.220.101.45 → 192.168.1.10  TCP SYN-ACK
Frame 47: 185.220.101.45 → 192.168.1.10  HTTP POST /upload.php (1.2 MB)
Frame 52: 185.220.101.45 → 192.168.1.10  HTTP GET /c2/beacon?id=abc123
Frame 88: 192.168.1.10 → 8.8.8.8         DNS TXT malware-c2.ru reverse lookup`,
    findings: ['Data exfiltration: 1.2 MB uploaded to attacker', 'C2 beacon to 185.220.101.45', 'DNS exfiltration via TXT record'],
  },
  {
    id: 'deleted.bin',
    icon: '🗑️',
    label: 'deleted.bin',
    type: 'Recovered File',
    content: `[RECOVERED FRAGMENT — partial data]
Filename: credentials_backup.zip
Size: 842 KB
Last accessed: 2026-03-04 02:17:44
MD5: 3d4f1a2b9c...
Contents: usernames.csv, hashes.txt, api_keys.env
Recovery status: 78% intact`,
    findings: ['Sensitive credentials file was deleted', 'Accessed during the breach window', 'Contains API keys and password hashes'],
  },
];

const DigitalForensicsLab = () => {
  const navigate = useNavigate();
  const [selected,  setSelected]  = useState(null);
  const [collected, setCollected] = useState(new Set());

  const collect = (id) => setCollected(prev => new Set([...prev, id]));
  const file     = EVIDENCE.find(e => e.id === selected);
  const complete = collected.size === EVIDENCE.length;

  const { endGame } = useGame();
  const awardedRef  = useRef(false);

  // ── Award XP when all evidence is collected ──────────────────────
  useEffect(() => {
    if (!complete || awardedRef.current) return;
    awardedRef.current = true;
    endGame({ xp: 30, gameType: 'lab', badgeIds: ['lab_explorer'] });
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main cyber-labs-page">
        <button className="game-back-btn" onClick={() => navigate('/cyber-labs')}>← Back to Cyber Labs</button>
        <div className="lab-shell">
          <span className="game-shell-icon">🔍</span>
          <h1 className="game-shell-title">Digital Forensics Lab</h1>
          <p className="game-shell-desc">
            A server was breached at 02:14 UTC. Examine the evidence files, identify key findings, and piece together what happened.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
            {/* File tree */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.65rem',
                fontFamily: 'var(--font-display)', letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Evidence Files
              </div>
              {EVIDENCE.map(e => (
                <button key={e.id} onClick={() => { setSelected(e.id); collect(e.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px',
                    background: selected === e.id ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    color: collected.has(e.id) ? 'var(--accent)' : 'var(--text-secondary)',
                    textAlign: 'left', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                  <span>{e.icon}</span>
                  <div>
                    <div>{e.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{e.type}</div>
                  </div>
                  {collected.has(e.id) && <span style={{ marginLeft: 'auto', color: '#22c55e', fontSize: '0.75rem' }}>✓</span>}
                </button>
              ))}
            </div>

            {/* Viewer */}
            <div>
              {file ? (
                <>
                  <div style={{ background: '#020617', borderRadius: 8, border: '1px solid #1e293b', padding: '14px 16px',
                    fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.8, color: '#94a3b8',
                    whiteSpace: 'pre-wrap', marginBottom: 14, minHeight: 180 }}>
                    {file.content}
                  </div>
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
                      color: '#22c55e', marginBottom: 8, textTransform: 'uppercase' }}>🔎 Key Findings</div>
                    {file.findings.map((f, i) => (
                      <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 5, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#22c55e', flexShrink: 0 }}>›</span> {f}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200,
                  color: 'var(--text-dim)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  ← Select an evidence file to examine
                </div>
              )}
            </div>
          </div>

          {complete && (
            <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.35)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: '#22c55e', fontWeight: 700, marginBottom: 6 }}>
                🏆 Investigation Complete
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                You identified a brute-force SSH intrusion, data exfiltration, and credential theft from 185.220.101.45.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DigitalForensicsLab;
