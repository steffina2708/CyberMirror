import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(3,6,15,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #0f2a3d',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: '60px',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.3rem' }}>🛡️</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: '1rem', letterSpacing: '0.1em',
          background: 'linear-gradient(90deg, #00f5ff, #ff0080)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>CYBERMIRROR</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user ? (
          <>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user.username}
            </span>
            <button className="btn btn-ghost" onClick={handleLogout}
              style={{ padding: '6px 16px', fontSize: '0.75rem' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: '0.75rem' }}>Login</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.75rem' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
