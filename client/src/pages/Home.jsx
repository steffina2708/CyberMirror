import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const features = [
  { icon: '🎣', title: 'Phishing Simulations', desc: 'Identify deceptive emails and social engineering attempts in realistic scenarios.' },
  { icon: '🔐', title: 'Fake Login Detection', desc: 'Learn to spot fraudulent websites designed to steal your credentials.' },
  { icon: '🎭', title: 'Social Engineering', desc: 'Understand psychological manipulation tactics used by real attackers.' },
  { icon: '🏆', title: 'Gamified Learning', desc: 'Earn points, badges, and climb the leaderboard as you master cybersecurity.' },
];

const stats = [
  { value: '50+', label: 'Scenarios' },
  { value: '10K+', label: 'Learners' },
  { value: '95%', label: 'Satisfaction' },
  { value: '3 Levels', label: 'Difficulty' },
];

const Home = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,245,255,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <Navbar />

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 24px 60px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{
            display: 'inline-block', padding: '4px 16px', borderRadius: 20,
            background: 'var(--cyan-dim)', border: '1px solid var(--cyan)',
            fontSize: '0.7rem', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: 24,
          }}>
            SETS Gameathon 2024 · Byte Force Team
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            lineHeight: 1.1, marginBottom: 24,
            background: 'linear-gradient(135deg, #e0f7ff 0%, #00f5ff 50%, #ff0080 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            CYBERMIRROR
          </h1>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: 'var(--text-secondary)', letterSpacing: '0.2em', marginBottom: 16,
            textTransform: 'uppercase',
          }}>
            The Digital Twin Attack Simulator
          </div>

          <p style={{
            fontSize: '1.05rem', color: 'var(--text-secondary)',
            lineHeight: 1.8, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px',
          }}>
            Learn cybersecurity by playing games. Face realistic cyberattack scenarios,
            make decisions, and build real-world defense skills in a safe environment.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '13px 32px' }}>
              Start Training →
            </Link>
            <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '13px 32px' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        background: 'rgba(7,13,26,0.8)', backdropFilter: 'blur(8px)',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center',
        }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cyan)', fontWeight: 900 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.7rem',
              color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12,
            }}>
              Core Features
            </div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>
              Learn By Doing, Not Reading
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: 10, color: 'var(--cyan)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '60px 24px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>Ready to Outsmart Cyber Threats?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
          Join thousands of users training their cybersecurity instincts.
        </p>
        <Link to="/register" className="btn btn-magenta" style={{ fontSize: '0.8rem', padding: '13px 36px' }}>
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px',
        textAlign: 'center', position: 'relative', zIndex: 1,
        fontSize: '0.75rem', color: 'var(--text-dim)',
      }}>
        CyberMirror · Team Byte Force · Loyola ICAM College of Engineering and Technology · SETS Gameathon 2024
      </footer>
    </div>
  );
};

export default Home;
