import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════════════
   AI CYBER NEURAL NETWORK BACKGROUND
   ─ 40 drifting nodes connected by proximity lines
   ─ Every 6th node is a larger "hub" with a pulse ring
   ─ Colors derived from theme so light/dark both work
   ─ Pauses when tab is hidden (Page Visibility API)
   ─ Resizes cleanly with ResizeObserver
   ═══════════════════════════════════════════════════════════════════ */

const NODE_COUNT   = 40;
const CONNECT_DIST = 150;
const BASE_SPEED   = 0.38;

export default function CyberNetworkBackground() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Theme-dependent colours ──────────────────────────────────
    // Canvas cannot read CSS vars directly; read them from the DOM.
    const style = getComputedStyle(document.documentElement);
    const isDark = theme === 'dark';

    // Node fill / glow
    const NODE_COLOR  = isDark ? '#00f5ff' : '#6366f1';
    const NODE_ALPHA  = isDark ? 0.70       : 0.50;
    const GLOW_COLOR  = isDark ? '#00f5ff44' : '#6366f144';

    // Edge line
    const LINE_R      = isDark ? 0   : 99;
    const LINE_G      = isDark ? 245 : 102;
    const LINE_B      = isDark ? 255 : 241;
    const LINE_ALPHA  = isDark ? 0.18 : 0.12;

    // Hub pulse ring colour
    const HUB_COLOR   = isDark ? '#ff00c8' : '#818cf8';

    // ── Canvas sizing ────────────────────────────────────────────
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Node factory ─────────────────────────────────────────────
    const rand = (min, max) => Math.random() * (max - min) + min;

    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x:      rand(0, canvas.width),
      y:      rand(0, canvas.height),
      vx:     rand(-BASE_SPEED, BASE_SPEED) || BASE_SPEED * 0.5,
      vy:     rand(-BASE_SPEED, BASE_SPEED) || BASE_SPEED * 0.5,
      r:      i % 6 === 0 ? 3.2 : 1.8,   // every 6th is a hub
      isHub:  i % 6 === 0,
      phase:  rand(0, Math.PI * 2),       // pulse offset
    }));

    // ── Animation loop ───────────────────────────────────────────
    let animId;
    let frameCount = 0;

    const draw = () => {
      if (document.hidden) { animId = requestAnimationFrame(draw); return; }

      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.phase += 0.028;
      });

      // Draw edges
      ctx.lineWidth = 0.8;
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const fade = 1 - dist / CONNECT_DIST;
            ctx.strokeStyle = `rgba(${LINE_R},${LINE_G},${LINE_B},${(LINE_ALPHA * fade).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = 0.65 + 0.35 * Math.sin(n.phase);

        // Hub: expanding pulse ring every 6th node
        if (n.isHub) {
          const ringR = n.r + 6 * (0.5 + 0.5 * Math.sin(n.phase));
          ctx.strokeStyle = HUB_COLOR + (isDark ? '55' : '40');
          ctx.lineWidth   = 0.7;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Glow halo
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        glow.addColorStop(0, GLOW_COLOR);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = NODE_COLOR;
        ctx.globalAlpha = NODE_ALPHA * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [theme]); // re-init on theme change to pick up new colours

  return (
    <div className="cyber-network-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
