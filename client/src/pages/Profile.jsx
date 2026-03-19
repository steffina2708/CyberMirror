import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import XPBar from '../components/XPBar';
import scoreService from '../services/scoreService';
import simulationService from '../services/simulationService';
import authService from '../services/authService';
import xpService from '../services/xpService';
import { toast } from 'react-toastify';
import { formatDate, getCategoryIcon } from '../utils/helpers';
import '../styles/profile.css';

/* ── Avatar options ─────────────────────────────────────────────── */
const AVATAR_OPTIONS = ['🧑‍💻','👩‍💻','🕵️','🦸','🦹','🤖','👾','🎯','🛡️','🔐','💀','🦊'];

/* ── Rank label helper ──────────────────────────────────────────── */
function rankLabel(level) {
  if (level >= 10) return 'LEGEND';
  if (level >= 7)  return 'ELITE OPERATOR';
  if (level >= 5)  return 'SENIOR ANALYST';
  if (level >= 3)  return 'CYBER DEFENDER';
  if (level >= 2)  return 'JUNIOR ANALYST';
  return 'SECURITY RECRUIT';
}

/* ── Badge rarity catalogue ─────────────────────────────────────── */
const BADGE_RARITY = {
  first_mission:    'common',
  phishing_hunter:  'rare',
  password_master:  'rare',
  network_defender: 'rare',
  soc_analyst:      'rare',
  lab_explorer:     'rare',
  cyber_gamer:      'epic',
  cyber_veteran:    'epic',
  xp_warrior:       'epic',
  cyber_champion:   'legendary',
};

const getRarity = (id) => BADGE_RARITY[id] || 'common';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [performance, setPerformance]   = useState(null);
  const [history,     setHistory]       = useState([]);
  const [xpProgress,  setXpProgress]    = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [saving,      setSaving]        = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      scoreService.getPerformance(),
      simulationService.getUserHistory(),
      xpService.getProgress().catch(() => null),
    ])
      .then(([perf, hist, xpData]) => {
        setPerformance(perf);
        setHistory(hist?.history || []);
        setXpProgress(xpData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveAvatar = async (icon) => {
    setSelectedAvatar(icon);
    setShowAvatarPicker(false);
    setSaving(true);
    try {
      const data = await authService.updateProfile({ avatar: icon });
      updateUser(data.user);
      toast.success('Avatar updated!');
    } catch (e) {
      toast.error('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived values ─────────────────────────────────────────── */
  const level          = xpProgress?.level          ?? performance?.level              ?? user?.level      ?? 1;
  const totalXP        = xpProgress?.totalXP        ?? user?.totalXP                   ?? 0;
  const totalScore     = performance?.totalScore     ?? user?.totalScore                ?? 0;
  const accuracy       = Math.round(performance?.accuracyPercentage ?? 0);
  const attempts       = performance?.totalAttempts  ?? 0;
  const correct        = performance?.correctAnswers ?? 0;
  const gamesCompleted = xpProgress?.gamesCompleted  ?? user?.gamesCompleted            ?? 0;
  const labsCompleted  = xpProgress?.labsCompleted   ?? user?.labsCompleted             ?? 0;

  const earnedBadges   = xpProgress?.earnedBadges   ?? user?.earnedBadges              ?? [];

  const stats = [
    { label: 'Total XP',    value: totalXP,         color: 'var(--accent)'   },
    { label: 'Level',       value: level,           color: 'var(--accent-2)' },
    { label: 'Games Done',  value: gamesCompleted,  color: '#f59e0b'         },
    { label: 'Labs Done',   value: labsCompleted,   color: '#22c55e'         },
    { label: 'Accuracy',    value: `${accuracy}%`,  color: '#06b6d4'         },
    { label: 'Attempts',    value: attempts,        color: '#a78bfa'         },
  ];

  const recentActivity = history.slice(0, 6);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="profile-page">

          {/* Ambient scan-line */}
          <div className="scan-line" />

          {/* ════════ HERO CARD ════════ */}
          <div className="profile-hero">

            {/* Avatar */}
            <div className="profile-avatar-wrap">
              <div
                className="profile-avatar-display"
                onClick={() => setShowAvatarPicker(s => !s)}
                title="Click to change avatar"
              >
                {selectedAvatar
                  ? <span className="avatar-emoji">{selectedAvatar}</span>
                  : <span className="avatar-initial">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                }
                <div className="avatar-edit-badge">✏️</div>
              </div>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && (
              <div className="avatar-picker">
                <p className="avatar-picker-label">Choose your avatar</p>
                <div className="avatar-grid">
                  {AVATAR_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      className={`avatar-option${selectedAvatar === icon ? ' active' : ''}`}
                      onClick={() => saveAvatar(icon)}
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Identity */}
            <div className="profile-info">
              <h1 className="profile-username">{user?.username}</h1>
              <p className="profile-email">{user?.email}</p>
              <div className="profile-rank-badge">
                <span className="rank-icon">◈</span>
                <span>{rankLabel(level)}</span>
              </div>
            </div>

            {/* Mini stat strip */}
            <div className="hero-stat-strip">
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: 'var(--accent)' }}>{level}</span>
                <span className="hero-stat-label">Level</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: '#f59e0b' }}>{accuracy}%</span>
                <span className="hero-stat-label">Accuracy</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: '#22c55e' }}>{correct}</span>
                <span className="hero-stat-label">Correct</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: '#f59e0b' }}>{gamesCompleted}</span>
                <span className="hero-stat-label">Games</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: '#22c55e' }}>{labsCompleted}</span>
                <span className="hero-stat-label">Labs</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value" style={{ color: 'var(--accent-2)' }}>{totalScore}</span>
                <span className="hero-stat-label">Points</span>
              </div>
            </div>
          </div>

          {/* ════════ XP BAR ════════ */}
          <XPBar totalXP={totalXP} level={level} animated />

          {/* ════════ STAT CARDS ════════ */}
          {loading ? (
            <div className="profile-loading">
              <span className="profile-loading-dot" />
              Connecting to SENTINEL database…
            </div>
          ) : (
            <div className="profile-stats-grid">
              {stats.map(s => (
                <div key={s.label} className="profile-stat-card">
                  <div className="profile-stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="profile-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ════════ EARNED BADGES ════════ */}
          <div className="profile-section-title">
            <span className="section-title-bar" />
            Badges Earned
            <span className="section-title-count">{earnedBadges.length}</span>
          </div>
          {earnedBadges.length === 0 ? (
            <div className="profile-no-badges">
              <span style={{ fontSize: '2rem' }}>🔒</span>
              <p>Complete games and labs to unlock badges!</p>
            </div>
          ) : (
            <div className="achievements-grid">
              {earnedBadges.map(b => (
                <div key={b.id} className={`badge-card badge-${getRarity(b.id)}`}>
                  <span className="badge-icon">{b.icon}</span>
                  <div className="badge-name">{b.name}</div>
                  <span className={`badge-rarity-label badge-rarity-${getRarity(b.id)}`}>
                    {getRarity(b.id)}
                  </span>
                  <span className="badge-tooltip">{b.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* ════════ RECENT ACTIVITY ════════ */}
          {recentActivity.length > 0 && (
            <>
              <div className="profile-section-title">
                <span className="section-title-bar" />
                Recent Activity
              </div>
              <div className="activity-list">
                {recentActivity.map((h, i) => (
                  <div key={i} className="activity-item">
                    <span className="activity-icon">{getCategoryIcon(h.category)}</span>
                    <div className="activity-info">
                      <div className="activity-title">{h.scenarioTitle}</div>
                      <div className="activity-date">{formatDate(h.completedAt)}</div>
                    </div>
                    <div className="activity-result">
                      <span className={`activity-pass${h.passed ? '' : ' activity-pass--fail'}`}>
                        {h.passed ? '✔ PASSED' : '✘ FAILED'}
                      </span>
                      <span className="activity-score">{h.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ════════ FOOTER ════════ */}
          <div className="profile-footer-row">
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
            {saving && <span className="profile-saving">Saving…</span>}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Profile;
