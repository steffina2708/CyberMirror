import React, { useEffect, useState, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from 'react-simple-maps';

/* ═══════════════════════════════════════════════════════════════════
   LIVE GLOBAL CYBER ATTACK MAP
   Uses react-simple-maps for the world projection.
   Simulated attacks every 2.5s — keeps last 12 in state.
   All land/border colors use CSS vars (theme-aware).
   Attack-type colors are semantic (red=DDoS, amber=phishing, etc.)
   and stay consistent across themes.
   ═══════════════════════════════════════════════════════════════════ */

const GEO_URL =
  'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json';

/*── Realistic city coords [longitude, latitude] ────────────────── */
const SOURCES = [
  { name: 'Moscow',      coords: [37.62,   55.75] },
  { name: 'Beijing',     coords: [116.40,  39.90] },
  { name: 'Tehran',      coords: [51.39,   35.69] },
  { name: 'Pyongyang',   coords: [125.75,  39.02] },
  { name: 'Lagos',       coords: [3.38,     6.45] },
  { name: 'Minsk',       coords: [27.57,   53.90] },
  { name: 'Bucharest',   coords: [26.10,   44.44] },
  { name: 'São Paulo',   coords: [-46.63, -23.55] },
  { name: 'Caracas',     coords: [-66.92,  10.49] },
  { name: 'Algiers',     coords: [3.06,    36.74] },
];

const TARGETS = [
  { name: 'New York',    coords: [-74.01,  40.71] },
  { name: 'London',      coords: [-0.13,   51.51] },
  { name: 'Tokyo',       coords: [139.69,  35.69] },
  { name: 'Frankfurt',   coords: [8.69,    50.11] },
  { name: 'Sydney',      coords: [151.21, -33.87] },
  { name: 'Paris',       coords: [2.35,    48.86] },
  { name: 'Toronto',     coords: [-79.38,  43.65] },
  { name: 'Singapore',   coords: [103.82,   1.35] },
  { name: 'Chicago',     coords: [-87.63,  41.88] },
  { name: 'Seoul',       coords: [126.98,  37.57] },
  { name: 'Amsterdam',   coords: [4.90,    52.37] },
  { name: 'Johannesburg',coords: [28.04,  -26.20] },
  { name: 'San Francisco',coords: [-122.42, 37.77] },
  { name: 'Mumbai',      coords: [72.88,   19.08] },
];

/* ── Attack type palette — semantic colors stay identical in both themes */
const ATTACK_TYPES = [
  { type: 'DDoS',       color: '#ef4444', shadow: '#ef44444d' },
  { type: 'Phishing',   color: '#f59e0b', shadow: '#f59e0b4d' },
  { type: 'Exploit',    color: '#a855f7', shadow: '#a855f74d' },
  { type: 'Malware',    color: '#ff4d6d', shadow: '#ff4d6d4d' },
  { type: 'Ransomware', color: '#06b6d4', shadow: '#06b6d44d' },
];

let uidCounter = 0;
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function AttackMap() {
  const [attacks, setAttacks] = useState([]);
  const [counts,  setCounts]  = useState({ total: 0, blocked: 0 });

  const spawnAttack = useCallback(() => {
    const src    = pick(SOURCES);
    const tgt    = pick(TARGETS.filter(t => t.name !== src.name));
    const atType = pick(ATTACK_TYPES);
    const uid    = ++uidCounter;
    const blocked = Math.random() > 0.25;

    setAttacks(prev => [
      { uid, src, tgt, atType, blocked, born: Date.now() },
      ...prev,
    ].slice(0, 12));

    setCounts(prev => ({
      total:   prev.total + 1,
      blocked: prev.blocked + (blocked ? 1 : 0),
    }));
  }, []);

  useEffect(() => {
    // Fire one immediately so map isn't empty
    spawnAttack();
    const iv = setInterval(spawnAttack, 2500);
    return () => clearInterval(iv);
  }, [spawnAttack]);

  return (
    <div className="attack-map-card">
      {/* Header */}
      <div className="attack-map-header">
        <div className="attack-map-header-left">
          <span className="attack-map-dot" />
          <span className="attack-map-title">🌐 LIVE GLOBAL THREAT MAP</span>
          <span className="attack-map-badge">LIVE</span>
        </div>
        <div className="attack-map-counters">
          <span className="attack-map-counter">
            <span className="attack-map-counter-label">ATTACKS</span>
            <span className="attack-map-counter-value">{counts.total}</span>
          </span>
          <span className="attack-map-counter">
            <span className="attack-map-counter-label">BLOCKED</span>
            <span className="attack-map-counter-value attack-map-blocked">{counts.blocked}</span>
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="attack-map-canvas">
        <ComposableMap
          projectionConfig={{ scale: 155, center: [10, 10] }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Land */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: 'var(--map-land)', stroke: 'var(--map-border)', strokeWidth: 0.4, outline: 'none' },
                    hover:   { fill: 'var(--map-land-hover)', outline: 'none' },
                    pressed: { fill: 'var(--map-land)', outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Attack lines */}
          {attacks.map(a => (
            <Line
              key={a.uid}
              from={a.src.coords}
              to={a.tgt.coords}
              stroke={a.atType.color}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray="5 4"
              className="attack-line"
              style={{
                opacity: 0.85,
                filter: `drop-shadow(0 0 3px ${a.atType.shadow})`,
              }}
            />
          ))}

          {/* Source markers */}
          {attacks.map(a => (
            <Marker key={`src-${a.uid}`} coordinates={a.src.coords}>
              <circle r={3} fill={a.atType.color} opacity={0.7} />
            </Marker>
          ))}

          {/* Target markers — animated blinking ring */}
          {attacks.map(a => (
            <Marker key={`tgt-${a.uid}`} coordinates={a.tgt.coords}>
              <circle
                r={4}
                fill={a.atType.color}
                className="attack-target-dot"
                style={{ filter: `drop-shadow(0 0 4px ${a.atType.color})` }}
              />
              <circle
                r={8}
                fill="none"
                stroke={a.atType.color}
                strokeWidth={0.8}
                opacity={0.45}
                className="attack-target-ring"
              />
            </Marker>
          ))}
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="attack-map-legend">
        {ATTACK_TYPES.map(at => (
          <span key={at.type} className="attack-map-legend-item">
            <span className="attack-map-legend-dot" style={{ background: at.color, boxShadow: `0 0 5px ${at.shadow}` }} />
            <span className="attack-map-legend-label">{at.type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
