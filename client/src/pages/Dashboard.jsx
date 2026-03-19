import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SimulationCard from '../components/SimulationCard';
import { ThreatMonitor, TerminalText, CyberParticles } from '../components/CyberEffects';
import RadarScanner from '../components/RadarScanner';
import IntrusionAlert from '../components/IntrusionAlert';
import ThreatAnalyzer from '../components/ThreatAnalyzer';
import AttackMap from '../components/AttackMap';
import ThreatGlobe from '../components/ThreatGlobe';
import AttackPredictionPanel from '../components/AttackPredictionPanel';
import CyberAssistantConsole from '../components/CyberAssistantConsole';
import XPBar from '../components/XPBar';
import { useAuth } from '../context/AuthContext';
import simulationService from '../services/simulationService';
import scoreService from '../services/scoreService';
import aiService from '../services/aiService';
import { formatDate, getCategoryIcon } from '../utils/helpers';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [history, setHistory] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError,   setAiError]       = useState(null);
  const [aiCategory, setAiCategory]   = useState('mixed');

  useEffect(() => {
    const load = async () => {
      try {
        const [sc, hist, perf] = await Promise.all([
          simulationService.getAllScenarios(),
          simulationService.getUserHistory(),
          scoreService.getPerformance(),
        ]);
        setScenarios(sc.scenarios || []);
        setHistory(hist.history || []);
        setPerformance(perf);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === 'all' ? scenarios : scenarios.filter(s => s.difficulty === filter);

  // Which difficulty levels have at least one loaded scenario
  const available = new Set(scenarios.map(s => s.difficulty));

  const handleAIChallenge = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await aiService.generateScenario(aiCategory);
      navigate(`/simulation/${data.scenarioId}`);
    } catch (e) {
      setAiError('Could not generate AI scenario. Please try again.');
      setAiLoading(false);
    }
  };

  const stats = [
    { label: 'Total Score',    value: performance?.totalScore      ?? 0,    icon: '⬡', color: 'var(--cyan)'    },
    { label: 'Level',          value: performance?.level           ?? 1,    icon: '◈', color: 'var(--magenta)' },
    { label: 'Total Attempts', value: performance?.totalAttempts   ?? 0,    icon: '✓', color: 'var(--green)'   },
    { label: 'Accuracy',       value: `${performance?.accuracyPercentage ?? 0}%`, icon: '◎', color: 'var(--yellow)'  },
  ];

  return (
    <>
      <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main home-screen" style={{ marginTop: 0, paddingTop: 32 }}>

        {/* Ambient effects — always rendered, theme changes intensity only */}
        <CyberParticles />
        <div className="scan-line" />

        {/* Data stream lines — decorative only */}
        <div className="data-streams-container" aria-hidden="true">
          {[{ left: '8%', delay: '0s' }, { left: '23%', delay: '1.4s' }, { left: '41%', delay: '2.8s' }, { left: '63%', delay: '0.7s' }, { left: '82%', delay: '3.5s' }].map((s, i) => (
            <div key={i} className="data-stream" style={{ left: s.left, animationDelay: s.delay }} />
          ))}
        </div>

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <p className="dashboard-command-label">Welcome back, Agent</p>
            <h1 className="dashboard-title">{user?.username}</h1>
            <p className="dashboard-subtitle">
              <TerminalText />
            </p>
            <div className="dashboard-status-row">
              <span className="status-dot status-dot--ok radar-pulse" />
              <span className="dashboard-status-text">
                System Integrity: <strong>SECURE</strong>
              </span>
            </div>
          </div>
          <RadarScanner />
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* XP Progress Bar */}
        <XPBar
          totalXP={user?.totalXP ?? performance?.totalScore ?? 0}
          level={user?.level ?? performance?.level ?? 1}
          animated
        />

        {/* Live Threat Monitor */}
        <ThreatMonitor />

        {/* AI Cyber Assistant Console */}
        <CyberAssistantConsole />

        {/* AI Attack Prediction Panel */}
        <AttackPredictionPanel performance={performance} />

        {/* AI Threat Analyzer */}
        <ThreatAnalyzer />

        {/* AI Challenge Mode ─────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,.12), rgba(6,182,212,.08))',
          border: '1px solid rgba(79,70,229,.35)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>🧠</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '.04em' }}>
                AI CHALLENGE MODE
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Dynamically generated scenario tuned to your skill level
              </div>
            </div>
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em',
              padding: '4px 10px', borderRadius: 999,
              background: 'linear-gradient(90deg,#4f46e5,#06b6d4)',
              color: '#fff',
              animation: 'aiPulseGlow 2s ease-in-out infinite',
            }}>AI POWERED</span>
          </div>

          {/* Category selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[['mixed','🎲 Mixed'],['phishing','🎣 Phishing'],['website','🌐 Fake Sites'],['ransomware','🔒 Ransomware']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setAiCategory(val)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                  border: aiCategory === val ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,.12)',
                  background: aiCategory === val ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)',
                  color: aiCategory === val ? '#a5b4fc' : 'var(--text-dim)',
                  fontWeight: aiCategory === val ? 700 : 400,
                  transition: 'all .15s',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {aiError && (
            <div style={{ fontSize: '0.8rem', color: 'var(--red)', marginBottom: 10 }}>{aiError}</div>
          )}

          <button
            onClick={handleAIChallenge}
            disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 28px', borderRadius: 10, border: 'none', cursor: aiLoading ? 'not-allowed' : 'pointer',
              background: aiLoading ? 'rgba(99,102,241,.25)' : 'linear-gradient(90deg,#4f46e5,#06b6d4)',
              color: '#fff', fontWeight: 700, fontSize: '0.92rem', letterSpacing: '.02em',
              transition: 'opacity .2s', opacity: aiLoading ? .7 : 1,
            }}
          >
            {aiLoading ? (
              <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spinRing .8s linear infinite' }} /> Generating Challenge…</>
            ) : (
              <>🧠 Start AI Challenge</>
            )}
          </button>
        </div>

        {/* Live Global Threat Map (2D) */}
        <AttackMap />

        {/* ── Multiplayer Battle CTA ───────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,.15) 0%, rgba(6,182,212,.1) 100%)',
            border: '1px solid rgba(79,70,229,.4)',
            borderRadius: 16,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            margin: '0 0 24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '1.4rem' }}>⚔️</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e2e8f0', letterSpacing: '.04em' }}>
                MULTIPLAYER BATTLE
              </span>
              <span style={{
                background: 'linear-gradient(90deg,#4f46e5,#06b6d4)',
                color: '#fff', fontSize: '.62rem', fontWeight: 800,
                padding: '2px 9px', borderRadius: 999, letterSpacing: '.08em',
              }}>LIVE PvP</span>
            </div>
            <p style={{ margin: 0, color: 'var(--muted-text, #64748b)', fontSize: '.9rem' }}>
              Challenge real players in real-time cyber battles — or practice against an AI bot.
            </p>
          </div>
          <button
            onClick={() => navigate('/multiplayer')}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 700, fontSize: '.95rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 18px rgba(79,70,229,.4)',
            }}
          >
            ⚔️ Enter Arena
          </button>
        </div>

        {/* 3D Cyber Threat Globe */}
        <ThreatGlobe />

        {/* Scenarios */}
        <div className="section-title" style={{ marginBottom: 16 }}>
          Attack Scenarios
        </div>

        {/* Filter pills */}
        <div className="filter-pills">
          {['all', 'easy', 'medium', 'hard', 'expert'].map(d => {
            const hasScenarios = d === 'all' || available.has(d);
            const active = filter === d;
            return (
              <button
                key={d}
                onClick={() => hasScenarios && setFilter(d)}
                disabled={!hasScenarios}
                className={`filter-pill${active ? ' active' : ''}${!hasScenarios ? ' disabled' : ''}`}
              >
                {d}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
            Loading scenarios...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
            No scenarios found. Check back later.
          </div>
        ) : (
          <div className="scenarios-grid" style={{ marginBottom: 40 }}>
            {filtered.map(s => <SimulationCard key={s._id} scenario={s} />)}
          </div>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <>
            <div className="section-title">Recent Sessions</div>
            <div className="history-list">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="history-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem' }}>{getCategoryIcon(h.category)}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{h.scenarioTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatDate(h.completedAt)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', color: 'var(--yellow)', fontSize: '0.9rem' }}>
                      {h.score} pts
                    </div>
                    <div style={{ fontSize: '0.7rem', color: h.passed ? 'var(--green)' : 'var(--red)' }}>
                      {h.passed ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>

    {/* Intrusion alert — fixed position, outside layout flow */}
    <IntrusionAlert />
    </>
  );
};

export default Dashboard;
