import React, { useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   AI ATTACK PREDICTION PANEL
   ─ Accepts the already-fetched `performance` prop from Dashboard
     so no second API call is needed.
   ─ All prediction logic runs client-side via useMemo.
   ─ Pure CSS-var theming — identical layout in light and dark.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Threat catalogue ─────────────────────────────────────────────
   Each entry maps to an accuracy / attempts bracket and carries:
   threat        — display name
   risk          — 'HIGH' | 'MEDIUM' | 'LOW'
   icon          — emoji prefix for the threat badge
   reason(acc,att) — dynamic reasoning text builder
   action        — recommended defensive action
───────────────────────────────────────────────────────────────────── */
const CATALOGUE = [
  {
    id: 'phishing',
    threat: 'Credential Phishing Campaign',
    risk: 'HIGH',
    icon: '🎣',
    reason: (acc) =>
      `Your phishing detection accuracy is currently ${acc}%. ` +
      `This indicates a significant vulnerability to credential harvesting attacks ` +
      `where adversaries mimic trusted organisations to steal login data.`,
    action: 'Complete advanced phishing defense & email-header analysis training.',
  },
  {
    id: 'social',
    threat: 'Social Engineering Attack',
    risk: 'HIGH',
    icon: '🕵️',
    reason: (acc, att) =>
      `Only ${att} simulation${att === 1 ? '' : 's'} completed with ${acc}% accuracy. ` +
      `Limited exposure to social engineering scenarios leaves you susceptible to ` +
      `pretexting and impersonation tactics used in targeted intrusions.`,
    action: 'Run at least 5 social engineering simulations and review deception indicators.',
  },
  {
    id: 'malware',
    threat: 'Malware Email Attachment',
    risk: 'MEDIUM',
    icon: '📎',
    reason: (acc) =>
      `Accuracy of ${acc}% places you in the moderate-risk zone. ` +
      `Attackers commonly embed macro-laden Office documents or weaponised PDFs ` +
      `in spear-phishing emails — a gap your current profile suggests is exploitable.`,
    action: 'Enable sandboxed attachment analysis and review macro-security policies.',
  },
  {
    id: 'apt',
    threat: 'Advanced Persistent Threat (APT)',
    risk: 'LOW',
    icon: '🔬',
    reason: (acc) =>
      `Strong accuracy of ${acc}% indicates solid foundational defenses. ` +
      `However, nation-state APT groups use slow, multi-stage intrusions designed ` +
      `to evade detection — continuous vigilance and threat-hunting remain critical.`,
    action: 'Maintain vigilance with periodic threat-hunting drills and log-anomaly reviews.',
  },
];

/* ── Core prediction logic ──────────────────────────────────────── */
function predict(performance) {
  if (!performance) return null;

  const acc = Math.round(performance.accuracyPercentage ?? 0);
  const att = performance.totalAttempts ?? 0;

  let entry;
  if (acc < 50)            entry = CATALOGUE[0]; // Phishing        → HIGH
  else if (att < 3)        entry = CATALOGUE[1]; // Social Eng      → HIGH
  else if (acc <= 70)      entry = CATALOGUE[2]; // Malware email   → MEDIUM
  else                     entry = CATALOGUE[3]; // APT             → LOW

  const confidence = acc < 50  ? 94
    : att  < 3   ? 88
    : acc <= 70  ? 76
    :              61;

  return { ...entry, acc, att, confidence };
}

/* ── Sub-components ─────────────────────────────────────────────── */
function RiskBadge({ level }) {
  const cls = {
    HIGH:   'pred-risk pred-risk--high',
    MEDIUM: 'pred-risk pred-risk--medium',
    LOW:    'pred-risk pred-risk--low',
  }[level] ?? 'pred-risk';

  const icon = level === 'HIGH' ? '▲' : level === 'MEDIUM' ? '◆' : '▼';
  return <span className={cls}>{icon} {level}</span>;
}

function ConfidenceBar({ value }) {
  return (
    <div className="pred-conf-wrap">
      <div className="pred-conf-bar">
        <div className="pred-conf-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="pred-conf-label">{value}% confidence</span>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function AttackPredictionPanel({ performance }) {
  const result = useMemo(() => predict(performance), [performance]);

  /* Loading skeleton */
  if (!result) {
    return (
      <div className="attack-prediction ai-glow">
        <div className="pred-header">
          <span className="pred-header-icon">🤖</span>
          <span className="pred-title">AI Threat Prediction Engine</span>
          <span className="pred-badge">ANALYZING…</span>
        </div>
        <div className="pred-skeleton">
          <div className="pred-skeleton-line" style={{ width: '60%' }} />
          <div className="pred-skeleton-line" style={{ width: '40%' }} />
          <div className="pred-skeleton-line" style={{ width: '80%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="attack-prediction ai-glow">

      {/* ── Panel header ──────────────────────────────────────── */}
      <div className="pred-header">
        <span className="pred-header-icon">🤖</span>
        <span className="pred-title">AI Threat Prediction Engine</span>
        <span className="pred-badge pred-badge--live">LIVE</span>
      </div>

      {/* ── Predicted threat ──────────────────────────────────── */}
      <div className="pred-section">
        <div className="pred-section-label">▸ Predicted Next Threat</div>
        <div className="pred-threat-row">
          <span className="pred-threat-icon">{result.icon}</span>
          <span className="pred-threat-name">{result.threat}</span>
        </div>
        <ConfidenceBar value={result.confidence} />
      </div>

      {/* ── Risk level ────────────────────────────────────────── */}
      <div className="pred-section">
        <div className="pred-section-label">▸ Risk Level</div>
        <RiskBadge level={result.risk} />
      </div>

      {/* ── AI reasoning ──────────────────────────────────────── */}
      <div className="pred-section">
        <div className="pred-section-label">▸ AI Reasoning</div>
        <p className="pred-reasoning">
          {result.reason(result.acc, result.att)}
        </p>
      </div>

      {/* ── Recommended action ────────────────────────────────── */}
      <div className="pred-section pred-action-section">
        <div className="pred-section-label">▸ Recommended Action</div>
        <div className="pred-action">
          <span className="pred-action-icon">⚡</span>
          {result.action}
        </div>
      </div>

      {/* ── Footer metrics ────────────────────────────────────── */}
      <div className="pred-footer">
        <span>Accuracy on file: <strong>{result.acc}%</strong></span>
        <span>Simulations completed: <strong>{result.att}</strong></span>
      </div>
    </div>
  );
}
