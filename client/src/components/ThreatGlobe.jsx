import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════════════
   3D CYBER THREAT GLOBE
   ─ Rotating wireframe globe rendered via react-three-fiber
   ─ Attack arcs drawn on per-frame then fade out
   ─ Pulsing dots at attack origins
   ─ All theme colours resolved via useTheme() into hex — CSS vars
     cannot be read by Three.js materials.
   ═══════════════════════════════════════════════════════════════════ */

const GLOBE_R   = 2;
const DRAW_DUR  = 1.6;   // s — arc draws in
const HOLD_DUR  = 0.9;   // s — arc stays full
const FADE_DUR  = 0.9;   // s — arc fades out
const TOTAL_DUR = (DRAW_DUR + HOLD_DUR + FADE_DUR) * 1000; // ms

/* ── Utils ──────────────────────────────────────────────────────── */
function latLngToVec3(lat, lng, r = GLOBE_R) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildArcPoints(srcVec, tgtVec, elevation = 1.45) {
  const mid = srcVec.clone()
    .add(tgtVec)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(GLOBE_R * elevation);
  return new THREE.CatmullRomCurve3([srcVec, mid, tgtVec]).getPoints(72);
}

/* ── Attack type palette — fixed semantic colors, both themes ──── */
const ATTACK_TYPES = [
  { type: 'DDoS',       color: 0xef4444 },
  { type: 'Phishing',   color: 0xf59e0b },
  { type: 'Exploit',    color: 0xa855f7 },
  { type: 'Malware',    color: 0xff4d6d },
  { type: 'Ransomware', color: 0x06b6d4 },
];

/* ── City coordinates [lat, lng] ────────────────────────────────── */
const SOURCES = [
  [55.75,  37.62], // Moscow
  [39.90, 116.40], // Beijing
  [35.69,  51.39], // Tehran
  [39.02, 125.75], // Pyongyang
  [ 6.45,   3.38], // Lagos
  [53.90,  27.57], // Minsk
  [10.49, -66.92], // Caracas
  [-23.55,-46.63], // São Paulo
  [36.74,   3.06], // Algiers
  [44.44,  26.10], // Bucharest
];

const TARGETS = [
  [40.71, -74.01], // New York
  [51.51,  -0.13], // London
  [35.69, 139.69], // Tokyo
  [50.11,   8.69], // Frankfurt
  [-33.87,151.21], // Sydney
  [48.86,   2.35], // Paris
  [43.65, -79.38], // Toronto
  [ 1.35, 103.82], // Singapore
  [41.88, -87.63], // Chicago
  [37.57, 126.98], // Seoul
];

let UID = 0;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ════════════════════════════════════════════════════════════════════
   THREE.JS COMPONENTS (run inside Canvas context)
   ════════════════════════════════════════════════════════════════════ */

/* ── Single animated attack arc ─────────────────────────────────── */
function AttackArc({ attack }) {
  const lineRef = useRef();

  const arcPoints = useMemo(() => {
    const src = latLngToVec3(attack.src[0], attack.src[1]);
    const tgt = latLngToVec3(attack.tgt[0], attack.tgt[1]);
    return buildArcPoints(src, tgt);
  }, [attack.src, attack.tgt]);

  // Initialise with 2 points so geometry exists
  useEffect(() => {
    lineRef.current?.geometry.setFromPoints(arcPoints.slice(0, 2));
  }, [arcPoints]);

  useFrame(() => {
    if (!lineRef.current) return;
    const age   = (Date.now() - attack.born) / 1000; // seconds since spawn
    const total = DRAW_DUR + HOLD_DUR + FADE_DUR;
    if (age >= total) { lineRef.current.material.opacity = 0; return; }

    let drawProgress, opacity;
    if (age < DRAW_DUR) {
      drawProgress = age / DRAW_DUR;
      opacity      = Math.min(1, drawProgress * 4);
    } else if (age < DRAW_DUR + HOLD_DUR) {
      drawProgress = 1;
      opacity      = 1;
    } else {
      drawProgress = 1;
      opacity      = 1 - (age - DRAW_DUR - HOLD_DUR) / FADE_DUR;
    }

    const count = Math.max(2, Math.floor(arcPoints.length * drawProgress));
    lineRef.current.geometry.setFromPoints(arcPoints.slice(0, count));
    lineRef.current.geometry.computeBoundingSphere();
    lineRef.current.material.opacity = Math.max(0, opacity);
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color={attack.atType.color}
        transparent
        opacity={0}
        linewidth={2}
      />
    </line>
  );
}

/* ── Pulsing dot at attack source ───────────────────────────────── */
function PulseDot({ position, color }) {
  const meshRef = useRef();
  const phase   = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    phase.current += delta * 3.5;
    const s = 1 + 0.55 * Math.sin(phase.current);
    if (meshRef.current) meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.044, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.92} />
    </mesh>
  );
}

/* ── Ambient particle field ─────────────────────────────────────── */
function StarField({ isDark }) {
  const pts = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 300; i++) {
      const r = 9 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    return new Float32Array(positions);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={pts}
          count={pts.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={isDark ? 0x00f5ff : 0x4f46e5}
        size={0.03}
        transparent
        opacity={isDark ? 0.45 : 0.25}
      />
    </points>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SATELLITE SCANNER
   ─ Orbit ring + satellite dot + scan-beam cone
   ─ Rotates independently of the globe via its own useFrame
   ─ Inclined ~33 ° from equatorial plane for visual depth
   ════════════════════════════════════════════════════════════════════ */
const ORBIT_R = 2.9;   // satellite orbit radius (> GLOBE_R=2)

function SatelliteScanner({ isDark }) {
  const groupRef = useRef();

  // Theme colours — Three.js materials take hex integers, not CSS vars
  const scanColor = isDark ? 0x00f5ff : 0x6366f1;
  const beamColor = isDark ? 0x00f5ff : 0x818cf8;

  // Rotate entire scanner group each frame → satellite orbits
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.z += delta * 0.75;
  });

  return (
    // Slight inclination so orbit isn't flat-on to the camera
    <group ref={groupRef} rotation={[Math.PI / 5.5, 0.4, 0]}>

      {/* ── Orbit path ring ──────────────────────────────────── */}
      <mesh>
        <torusGeometry args={[ORBIT_R, 0.006, 8, 90]} />
        <meshBasicMaterial
          color={scanColor}
          transparent
          opacity={isDark ? 0.35 : 0.20}
        />
      </mesh>

      {/* ── Satellite body (glowing sphere at +X of orbit) ─── */}
      <mesh position={[ORBIT_R, 0, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={scanColor} />
      </mesh>

      {/*
        ── Scanning beam (open cone) ─────────────────────────
        ConeGeometry tip is at +Y, base at -Y (unrotated).
        After rotating [0,0,π/2]  →  tip is at +X, base at -X.
        Positioned at [ORBIT_R/2, 0, 0] so:
          tip  = ORBIT_R/2 + ORBIT_R/2 = ORBIT_R   (satellite)
          base = ORBIT_R/2 - ORBIT_R/2 = 0         (globe centre)
      */}
      <mesh position={[ORBIT_R / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[1.4, ORBIT_R, 32, 1, true]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={isDark ? 0.10 : 0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Second, slightly wider pass for a soft glow halo */}
      <mesh position={[ORBIT_R / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[1.9, ORBIT_R, 32, 1, true]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={isDark ? 0.04 : 0.025}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ── Main rotating globe group ──────────────────────────────────── */
function GlobeScene({ attacks, isDark }) {
  const groupRef = useRef();

  // Theme-dependent hex colors
  const wireColor = isDark ? 0x00f5ff  : 0x4f46e5;
  const bodyColor = isDark ? 0x0b2545  : 0xdbeafe;
  const atmColor  = isDark ? 0x001122  : 0xc7d2fe;
  const emissive  = isDark ? 0x003366  : 0x818cf8;

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={groupRef}>
      {/* Back-face atmosphere glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.08, 32, 32]} />
        <meshStandardMaterial
          color={atmColor}
          emissive={emissive}
          emissiveIntensity={isDark ? 0.35 : 0.1}
          transparent
          opacity={isDark ? 0.06 : 0.10}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Solid globe body */}
      <mesh>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={isDark ? 0.12 : 0.04}
          transparent
          opacity={isDark ? 0.55 : 0.65}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Latitude/longitude wireframe */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.004, 28, 28]} />
        <meshBasicMaterial
          color={wireColor}
          wireframe
          transparent
          opacity={isDark ? 0.22 : 0.15}
        />
      </mesh>

      {/* Equator + prime-meridian accent rings */}
      {[0, Math.PI / 2].map((rot, i) => (
        <mesh key={i} rotation={[rot, 0, 0]}>
          <torusGeometry args={[GLOBE_R * 1.006, 0.004, 6, 80]} />
          <meshBasicMaterial
            color={wireColor}
            transparent
            opacity={isDark ? 0.45 : 0.28}
          />
        </mesh>
      ))}

      {/* Attack arcs */}
      {attacks.map(a => <AttackArc key={a.uid} attack={a} />)}

      {/* Pulse dots at attack origins */}
      {attacks.map(a => {
        const v = latLngToVec3(a.src[0], a.src[1], GLOBE_R * 1.012);
        return (
          <PulseDot
            key={`dot-${a.uid}`}
            position={[v.x, v.y, v.z]}
            color={a.atType.color}
          />
        );
      })}
    </group>
  );
}

/* ════════════════════════════════════════════════════════════════════
   REACT WRAPPER
   ════════════════════════════════════════════════════════════════════ */
export default function ThreatGlobe() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [attacks, setAttacks] = useState([]);
  const [counts,  setCounts]  = useState({ total: 0, blocked: 0 });

  /* Spawn a new attack every 2.8 s */
  const spawn = useCallback(() => {
    const src    = pick(SOURCES);
    const tgt    = pick(TARGETS);
    const atType = pick(ATTACK_TYPES);
    const uid    = ++UID;
    const blocked = Math.random() > 0.25;

    setAttacks(prev => [
      { uid, src, tgt, atType, blocked, born: Date.now() },
      ...prev,
    ].slice(0, 10));

    setCounts(p => ({ total: p.total + 1, blocked: p.blocked + (blocked ? 1 : 0) }));
  }, []);

  /* Spawn immediately + on interval */
  useEffect(() => {
    spawn();
    const iv = setInterval(spawn, 2800);
    return () => clearInterval(iv);
  }, [spawn]);

  /* Clean up expired attacks from state (avoid memory growth) */
  useEffect(() => {
    const gc = setInterval(() => {
      setAttacks(prev => prev.filter(a => Date.now() - a.born < TOTAL_DUR + 500));
    }, 3000);
    return () => clearInterval(gc);
  }, []);

  const bgColor = isDark ? '#020617' : '#f0f4ff';

  return (
    <div className="globe-panel">
      {/* Header */}
      <div className="globe-panel-header">
        <div className="globe-panel-header-left">
          <span className="globe-dot" />
          <span className="globe-title">🌐 3D CYBER THREAT GLOBE</span>
          <span className="globe-badge">LIVE</span>
        </div>
        <div className="globe-counters">
          <span className="globe-counter">
            <span className="globe-counter-label">ATTACKS</span>
            <span className="globe-counter-value">{counts.total}</span>
          </span>
          <span className="globe-counter">
            <span className="globe-counter-label">BLOCKED</span>
            <span className="globe-counter-value globe-blocked">{counts.blocked}</span>
          </span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="globe-canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 5.8], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: bgColor }}
        >
          {/* Lighting */}
          <ambientLight intensity={isDark ? 0.35 : 0.65} />
          <directionalLight
            position={[4, 4, 4]}
            intensity={isDark ? 0.8 : 1.1}
            color={isDark ? 0x00aaff : 0xffffff}
          />
          <pointLight
            position={[-4, -2, -4]}
            intensity={isDark ? 0.4 : 0.2}
            color={isDark ? 0xff00c8 : 0x818cf8}
          />

          <StarField isDark={isDark} />
          <GlobeScene attacks={attacks} isDark={isDark} />
          <SatelliteScanner isDark={isDark} />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(3 * Math.PI) / 4}
          />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="globe-legend">
        {ATTACK_TYPES.map(at => (
          <span key={at.type} className="globe-legend-item">
            <span
              className="globe-legend-dot"
              style={{ background: `#${at.color.toString(16).padStart(6, '0')}` }}
            />
            <span className="globe-legend-label">{at.type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
