import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import '../styles/auth.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Agent profile created!');
      navigate('/login');
    } catch (err) {
      const message = err.message || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span className="auth-logo-icon">🛡️</span>
          <div className="auth-logo-name">CYBERMIRROR</div>
          <div className="auth-logo-sub">Join the CyberMirror training program</div>
        </div>

        <h2 className="auth-title">Create Agent Profile</h2>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Agent Codename</label>
            <input
              className="auth-input"
              type="text"
              placeholder="byte_force"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="agent@cybermirror.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? '⟳ Creating Profile...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already registered? <Link to="/login">Sign in</Link>
        </div>

        <div className="auth-back">
          <Link to="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
