import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   AI CYBER ASSISTANT CONSOLE
   ─ SOC-style terminal with typing animation
   ─ Accepts optional commands via an input bar
   ─ Auto-cycles through AI message sequences
   ─ Pure CSS-var theming — identical layout in light & dark
   ═══════════════════════════════════════════════════════════════════ */

/* ── Message sequences ────────────────────────────────────────────
   Each group runs in order; after the last group the cycle repeats.
   TYPE_DELAY  ms per character while typing
   PAUSE_AFTER ms the line stays visible before the next one starts
   SEQUENCE_GAP ms between completing one group and starting the next
─────────────────────────────────────────────────────────────────── */
const TYPE_DELAY    = 28;
const PAUSE_AFTER   = 1200;
const SEQUENCE_GAP  = 3500;

const AUTO_SEQUENCES = [
  [
    { text: '> Initializing CyberMirror AI v3.1…',        color: 'var(--accent)'   },
    { text: '> Connecting to threat intelligence feed…',   color: null              },
    { text: '> Feed connected. [OK]',                      color: 'var(--success)'  },
  ],
  [
    { text: '> Scanning recent simulation activity…',      color: null              },
    { text: '> 6 sessions found. Analyzing patterns…',     color: null              },
    { text: '> Phishing detection accuracy: 72%',          color: 'var(--warning)'  },
    { text: '> Credential spoofing resistance: 58%  ⚠',    color: 'var(--warning)'  },
  ],
  [
    { text: '> Querying global threat database…',          color: null              },
    { text: '> 14 active campaigns targeting this region', color: 'var(--danger)'   },
    { text: '> Recommended action: phishing defense drills', color: 'var(--accent)' },
  ],
  [
    { text: '> Running behavioral profile analysis…',      color: null              },
    { text: '> No anomalous login patterns detected.',     color: 'var(--success)'  },
    { text: '> Perimeter integrity: SECURE',               color: 'var(--success)'  },
    { text: '> Continue training to maintain readiness.',  color: null              },
  ],
];

/* ── Built-in command responses ──────────────────────────────────── */
const COMMAND_MAP = {
  help: [
    { text: '> Available commands:',                    color: 'var(--accent)' },
    { text: '    scan      — scan recent activity',     color: null            },
    { text: '    status    — system health report',     color: null            },
    { text: '    training  — training recommendations', color: null            },
    { text: '    clear     — clear console output',     color: null            },
  ],
  scan: [
    { text: '> Initiating deep scan…',                  color: null             },
    { text: '> Checking network endpoints…',            color: null             },
    { text: '> 0 active intrusions detected.',          color: 'var(--success)' },
    { text: '> Last scan completed successfully.',      color: 'var(--success)' },
  ],
  status: [
    { text: '> SYSTEM STATUS REPORT',                   color: 'var(--accent)'  },
    { text: '> Firewall:         ACTIVE',               color: 'var(--success)' },
    { text: '> IDS Engine:       RUNNING',              color: 'var(--success)' },
    { text: '> Threat feeds:     SYNCHRONIZED',        color: 'var(--success)' },
    { text: '> AI core:          OPERATIONAL',          color: 'var(--success)' },
  ],
  training: [
    { text: '> Generating training plan…',              color: null             },
    { text: '> Priority 1: Advanced phishing defense',  color: 'var(--warning)' },
    { text: '> Priority 2: Social engineering tactics', color: 'var(--warning)' },
    { text: '> Priority 3: Malware attachment detection', color: null           },
  ],
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function timestamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function CyberAssistantConsole() {
  /* lines = array of { id, text: string (final), visible: string (typed so far),
                        color, done: bool } */
  const [lines,    setLines]    = useState([]);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false); // true while typing sequence
  const outputRef  = useRef(null);
  const seqIdx     = useRef(0);
  const cancelRef  = useRef(false);  // set true to abort an in-progress sequence

  /* Auto-scroll on every new line / character */
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  /* ── Core: type a single line progressively ───────────────────── */
  const typeLine = useCallback((lineObj) => {
    return new Promise((resolve) => {
      const id = lineObj.id;
      let i = 0;
      const iv = setInterval(() => {
        if (cancelRef.current) { clearInterval(iv); resolve(); return; }
        i++;
        setLines(prev =>
          prev.map(l => l.id === id
            ? { ...l, visible: lineObj.text.slice(0, i) }
            : l
          )
        );
        if (i >= lineObj.text.length) {
          clearInterval(iv);
          setLines(prev => prev.map(l => l.id === id ? { ...l, done: true } : l));
          setTimeout(resolve, PAUSE_AFTER);
        }
      }, TYPE_DELAY);
    });
  }, []);

  /* ── Core: run an array of message objects in sequence ─────────── */
  const runSequence = useCallback(async (messages, isCommand = false) => {
    setBusy(true);
    cancelRef.current = false;

    // Add timestamp header for auto-sequences only
    if (!isCommand) {
      const tsId = Date.now() + Math.random();
      setLines(prev => [...prev, {
        id: tsId,
        text: `[${timestamp()}] — AI analysis cycle`,
        visible: `[${timestamp()}] — AI analysis cycle`,
        color: 'var(--text-dim)',
        done: true,
      }]);
    }

    for (const msg of messages) {
      if (cancelRef.current) break;
      const id = Date.now() + Math.random();
      const lineObj = { id, text: msg.text, visible: '', color: msg.color, done: false };
      setLines(prev => [...prev, lineObj]);
      await typeLine(lineObj);
    }

    setBusy(false);
  }, [typeLine]);

  /* ── Auto-cycle through sequences ──────────────────────────────── */
  useEffect(() => {
    let timer;

    const next = () => {
      const seq = AUTO_SEQUENCES[seqIdx.current % AUTO_SEQUENCES.length];
      seqIdx.current++;
      runSequence(seq).then(() => {
        timer = setTimeout(next, SEQUENCE_GAP);
      });
    };

    // Small initial delay before first message
    timer = setTimeout(next, 600);
    return () => {
      clearTimeout(timer);
      cancelRef.current = true;
    };
  }, [runSequence]);

  /* ── Command submission ─────────────────────────────────────────── */
  const submitCommand = useCallback((e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    setInput('');
    if (!cmd) return;

    // Echo the typed command
    const echoId = Date.now() + Math.random();
    setLines(prev => [...prev, {
      id: echoId,
      text: `$ ${cmd}`,
      visible: `$ ${cmd}`,
      color: 'var(--accent)',
      done: true,
    }]);

    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    const response = COMMAND_MAP[cmd];
    if (response) {
      cancelRef.current = true;  // abort any running auto-sequence
      setTimeout(() => runSequence(response, true), 80);
    } else {
      const unknownId = Date.now() + Math.random();
      setLines(prev => [...prev, {
        id: unknownId,
        text: `> Unknown command: "${cmd}". Type "help" for options.`,
        visible: `> Unknown command: "${cmd}". Type "help" for options.`,
        color: 'var(--danger)',
        done: true,
      }]);
    }
  }, [input, runSequence]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="cyber-console">

      {/* Header bar */}
      <div className="console-header">
        <div className="console-header-left">
          <span className="console-dot console-dot--red" />
          <span className="console-dot console-dot--yellow" />
          <span className="console-dot console-dot--green" />
          <span className="console-title">AI SECURITY ASSISTANT — SENTINEL v3.1</span>
        </div>
        <span className="console-status-badge">● LIVE</span>
      </div>

      {/* Output area */}
      <div className="console-output" ref={outputRef}>
        {lines.map(line => (
          <div key={line.id} className="console-line">
            <span
              className="console-text"
              style={line.color ? { color: line.color } : undefined}
            >
              {line.visible}
            </span>
            {/* Blinking cursor only on the last non-done line */}
            {!line.done && <span className="console-cursor" />}
          </div>
        ))}
        {/* Idle cursor after all lines are done */}
        {(lines.length === 0 || lines[lines.length - 1]?.done) && !busy && (
          <div className="console-line">
            <span className="console-text" style={{ color: 'var(--text-dim)' }}>$</span>
            <span className="console-cursor" />
          </div>
        )}
      </div>

      {/* Command input */}
      <form className="console-input-row" onSubmit={submitCommand}>
        <span className="console-prompt">$</span>
        <input
          className="console-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="help · scan · status · training · clear"
          autoComplete="off"
          spellCheck="false"
        />
        <button className="console-send-btn" type="submit">⏎</button>
      </form>
    </div>
  );
}
