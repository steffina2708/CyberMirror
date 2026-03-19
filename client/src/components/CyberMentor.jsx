import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/cybermentor.css';

const SUGGESTED = [
  'What is phishing?',
  'How do I make a strong password?',
  'What is ransomware?',
  'How does a DDoS attack work?',
  'What is MFA and why use it?',
  'How to detect fake websites?',
];

// Format response markdown-lite: **bold**, newlines, bullet • 
const formatText = (text) => {
  return text
    .split('\n')
    .map((line, i) => {
      // bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formatted = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);
      // bullet lines
      if (line.trim().startsWith('•') || line.trim().startsWith('*')) {
        return <div key={i} className="mentor-bullet">{formatted}</div>;
      }
      return <div key={i} className="mentor-line">{formatted}</div>;
    });
};

let msgId = 0;

const CyberMentor = () => {
  const { user } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState('');
  const [msgs,    setMsgs]    = useState([
    { id: ++msgId, role: 'mentor', text: `Hello, Agent ${user?.username || ''}! I'm CyberMentor — your AI cybersecurity guide.\n\nAsk me anything about threats, defences, or best practices. I'm here to help you train smarter. 🛡️` },
  ]);
  const [loading, setLoading] = useState(false);
  const [unread,  setUnread]  = useState(0);
  const bodyRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [msgs]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    const userMsgId = ++msgId;
    setMsgs(m => [...m, { id: userMsgId, role: 'user', text: msg }]);
    setLoading(true);

    try {
      const { data } = await api.post('/cybermentor/chat', { message: msg });
      const replyId = ++msgId;
      setMsgs(m => [...m, { id: replyId, role: 'mentor', text: data.reply }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMsgs(m => [...m, {
        id: ++msgId, role: 'mentor',
        text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, open]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────── */}
      <button
        className={`mentor-fab${open ? ' mentor-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="CyberMentor AI"
        aria-label="Open CyberMentor AI assistant"
      >
        {open ? '✕' : '🤖'}
        {!open && unread > 0 && (
          <span className="mentor-fab-badge">{unread}</span>
        )}
        {!open && <span className="mentor-fab-pulse" />}
      </button>

      {/* ── Chat window ─────────────────────────────────────────── */}
      {open && (
        <div className="mentor-window">
          {/* Header */}
          <div className="mentor-header">
            <div className="mentor-header-avatar">🤖</div>
            <div>
              <div className="mentor-header-name">CyberMentor</div>
              <div className="mentor-header-status">
                <span className="mentor-online-dot" />
                AI Cybersecurity Guide
              </div>
            </div>
            <button className="mentor-header-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="mentor-body" ref={bodyRef}>
            {msgs.map(m => (
              <div key={m.id} className={`mentor-msg mentor-msg--${m.role}`}>
                {m.role === 'mentor' && <span className="mentor-msg-avatar">🤖</span>}
                <div className="mentor-msg-bubble">
                  {formatText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mentor-msg mentor-msg--mentor">
                <span className="mentor-msg-avatar">🤖</span>
                <div className="mentor-msg-bubble mentor-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions (only at start) */}
          {msgs.length <= 2 && (
            <div className="mentor-suggestions">
              {SUGGESTED.map(s => (
                <button key={s} className="mentor-suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="mentor-footer">
            <textarea
              className="mentor-input"
              rows={1}
              placeholder="Ask about threats, defences, best practices…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              className={`mentor-send-btn${input.trim() ? ' mentor-send-btn--active' : ''}`}
              onClick={() => send()}
              disabled={loading || !input.trim()}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CyberMentor;
