import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/sidebar.css';

const GAMES = [
  { to: '/cyber-games/phishing-detective',   icon: '🎣', label: 'Phishing Detective' },
  { to: '/cyber-games/password-battle',      icon: '🔐', label: 'Password Battle' },
  { to: '/cyber-games/fake-website-hunter',  icon: '🌐', label: 'Fake Website Hunter' },
  { to: '/cyber-games/cyber-defense-strategy', icon: '🛡', label: 'Defense Strategy' },
  { to: '/cyber-games/network-defender',     icon: '🔥', label: 'Network Defender' },
];

const LABS = [
  { to: '/cyber-labs/hacker-simulator',      icon: '💻', label: 'Hacker Simulator' },
  { to: '/cyber-labs/digital-forensics',     icon: '🔍', label: 'Digital Forensics' },
  { to: '/cyber-labs/network-defense-puzzle',icon: '🧩', label: 'Network Puzzle' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [gamesOpen, setGamesOpen] = useState(location.pathname.startsWith('/cyber-games'));
  const [labsOpen,  setLabsOpen]  = useState(location.pathname.startsWith('/cyber-labs'));

  return (
    <aside className="sidebar-root">
      {/* Logo */}
      <div className="sidebar-logo">
        <span style={{ fontSize: '1.4rem' }}>🛡️</span>
        <div>
          <div className="sidebar-logo-name">CYBERMIRROR</div>
          <div className="sidebar-logo-sub">ATTACK SIMULATOR</div>
        </div>
      </div>

      {/* User info */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.avatar
            ? <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{user.avatar}</span>
            : (user?.username?.[0]?.toUpperCase() || 'U')
          }
        </div>
        <div>
          <div className="sidebar-username">{user?.username}</div>
          <div className="sidebar-level">Lvl {user?.level || 1} · {user?.totalScore || 0} pts</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard"    className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
          <span>⧡</span> Dashboard
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
          <span>◈</span> Leaderboard
        </NavLink>
        <NavLink to="/scenarios" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
          <span>🎯</span> Attack Scenarios
        </NavLink>

        {/* ── Cyber Games ──────────────────────────── */}
        <button
          className={`sidebar-nav-link sidebar-section-header${gamesOpen ? ' section-open' : ''}${location.pathname.startsWith('/cyber-games') ? ' active' : ''}`}
          onClick={() => setGamesOpen(o => !o)}
        >
          <span>🎮</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Cyber Games</span>
          <span className={`sidebar-section-arrow${gamesOpen ? ' open' : ''}`}>▶</span>
        </button>
        <div className={`sidebar-subnav${gamesOpen ? ' open' : ''}`}>
          <NavLink to="/cyber-games" end
            className={({ isActive }) => `sidebar-subnav-link${isActive ? ' active' : ''}`}>
            🏠 All Games
          </NavLink>
          {GAMES.map(g => (
            <NavLink key={g.to} to={g.to}
              className={({ isActive }) => `sidebar-subnav-link${isActive ? ' active' : ''}`}>
              {g.icon} {g.label}
            </NavLink>
          ))}
        </div>

        {/* ── Cyber Labs ───────────────────────────── */}
        <button
          className={`sidebar-nav-link sidebar-section-header${labsOpen ? ' section-open' : ''}${location.pathname.startsWith('/cyber-labs') ? ' active' : ''}`}
          onClick={() => setLabsOpen(o => !o)}
        >
          <span>🧪</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Cyber Labs</span>
          <span className={`sidebar-section-arrow${labsOpen ? ' open' : ''}`}>▶</span>
        </button>
        <div className={`sidebar-subnav${labsOpen ? ' open' : ''}`}>
          <NavLink to="/cyber-labs" end
            className={({ isActive }) => `sidebar-subnav-link${isActive ? ' active' : ''}`}>
            🏠 All Labs
          </NavLink>
          {LABS.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `sidebar-subnav-link${isActive ? ' active' : ''}`}>
              {l.icon} {l.label}
            </NavLink>
          ))}
        </div>

        <NavLink to="/profile" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
          <span>◎</span> Profile
        </NavLink>
      </nav>

      {/* Footer: theme toggle + logout */}
      <div className="sidebar-footer">
        <button
          className="sidebar-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button
          className="sidebar-logout-btn"
          onClick={() => { logout(); navigate('/'); }}
        >
          ⏻ Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
