import React from 'react';

/* ═══════════════════════════════════════════════════════════════════
   RADAR SCANNER — circular rotating threat radar widget.
   Pure CSS animation. Colors follow --accent via CSS vars.
   Works in both light and dark mode.
   ═══════════════════════════════════════════════════════════════════ */

export default function RadarScanner() {
  return (
    <div className="radar-widget" aria-label="Threat radar — scanning">
      <div className="radar">
        {/* Concentric rings */}
        <div className="radar-ring radar-ring-1" />
        <div className="radar-ring radar-ring-2" />
        <div className="radar-ring radar-ring-3" />

        {/* Crosshair lines */}
        <div className="radar-crosshair radar-crosshair-h" />
        <div className="radar-crosshair radar-crosshair-v" />

        {/* Rotating scan beam */}
        <div className="radar-beam" />

        {/* Static blips */}
        <div className="radar-blip" style={{ top: '28%', left: '62%' }} />
        <div className="radar-blip radar-blip--secondary" style={{ top: '67%', left: '24%' }} />
        <div className="radar-blip" style={{ top: '50%', left: '76%' }} />
      </div>

      <div className="radar-label">THREAT RADAR</div>
      <div className="radar-status">SCANNING</div>
    </div>
  );
}
