/* ═══════════════════════════════════════════════════════════════
   MultiplayerBattle.jsx — Full Real-Time PvP Battle Page
   Modes: Quick Match | Invite Friend | Practice vs AI
   ═══════════════════════════════════════════════════════════════ */
import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import Sidebar from '../components/Sidebar';
import '../styles/multiplayerBattle.css';

const SOCKET_URL   = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
const ANSWER_DELAY = 1800;   // ms before next question appears
const Q_TIME       = 15;     // per-question countdown

/* ── Phase constants ─────────────────────────────────────────── */
const PHASE = {
  LOBBY:    'lobby',
  QUEUE:    'queue',
  WAITING:  'waiting',   // invite host waiting for joiner
  BATTLE:   'battle',
  RESULT:   'result',
};

/* ── Helpers ─────────────────────────────────────────────────── */
const scoreColor = (mine, theirs) =>
  mine > theirs ? 'var(--mb-green)' : mine < theirs ? 'var(--mb-red)' : 'var(--mb-yellow)';

/* ════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════ */
const MultiplayerBattle = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { addXP } = useGame?.() ?? {};

  /* ── Socket ──────────────────────────────────────────────── */
  const socketRef    = useRef(null);
  const timerRef     = useRef(null);
  const startTimeRef = useRef(null);

  /* ── UI state ────────────────────────────────────────────── */
  const [phase,        setPhase]        = useState(PHASE.LOBBY);
  const [mode,         setMode]         = useState('quick');       // quick | invite | ai
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  /* ── Invite ──────────────────────────────────────────────── */
  const [inviteCode,   setInviteCode]   = useState('');
  const [codeInput,    setCodeInput]    = useState('');
  const [inviteError,  setInviteError]  = useState('');

  /* ── Match state ─────────────────────────────────────────── */
  const [roomId,       setRoomId]       = useState(null);
  const [mySocketId,   setMySocketId]   = useState(null);
  const [opponents,    setOpponents]    = useState([]);
  const [question,     setQuestion]     = useState(null);
  const [questionIdx,  setQuestionIdx]  = useState(0);
  const [totalQ,       setTotalQ]       = useState(0);
  const [myScore,      setMyScore]      = useState(0);
  const [oppScore,     setOppScore]     = useState(0);
  const [myCombo,      setMyCombo]      = useState(0);
  const [oppCombo,     setOppCombo]     = useState(0);
  const [answered,     setAnswered]     = useState(false);
  const [feedback,     setFeedback]     = useState(null);
  const [queuePos,     setQueuePos]     = useState(0);
  const [qTimer,       setQTimer]       = useState(Q_TIME);
  const [matchMode,    setMatchMode]    = useState('quick');

  /* ── Visual effects ──────────────────────────────────────── */
  const [myHit,        setMyHit]        = useState(false);
  const [oppHit,       setOppHit]       = useState(false);
  const [comboFlash,   setComboFlash]   = useState(false);
  const [scoreFlash,   setScoreFlash]   = useState(false);

  /* ── Result ──────────────────────────────────────────────── */
  const [result,       setResult]       = useState(null);

  /* ─────────────────────────────────────────────────────────── */
  /* Timer helpers                                               */
  /* ─────────────────────────────────────────────────────────── */
  const clearQTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const resetQTimer = useCallback(() => {
    clearQTimer();
    setQTimer(Q_TIME);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setQTimer(t => {
        if (t <= 1) { clearQTimer(); return 0; }
        return t - 1;
      });
    }, 1000);
  }, [clearQTimer]);

  /* ─────────────────────────────────────────────────────────── */
  /* Socket setup                                               */
  /* ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sock = io(`${SOCKET_URL}/battle`, { transports: ['websocket'] });
    socketRef.current = sock;

    sock.on('connect', () => setMySocketId(sock.id));

    sock.on('queue_joined', ({ position }) => {
      setQueuePos(position);
      setPhase(PHASE.QUEUE);
    });

    sock.on('invite_room_created', ({ code }) => {
      setInviteCode(code);
      setPhase(PHASE.WAITING);
    });

    sock.on('invite_error', ({ message }) => {
      setInviteError(message);
    });

    sock.on('battle_error', ({ message }) => {
      setInviteError(message);
    });

    sock.on('match_found', ({
      roomId: rid, mode: modeReceived,
      opponents: opps, question: q,
      questionIdx: qi, totalQuestions, durationMs,
    }) => {
      setRoomId(rid);
      setMatchMode(modeReceived || 'quick');
      setOpponents(opps);
      setQuestion(q);
      setQuestionIdx(qi);
      setTotalQ(totalQuestions);
      setMyScore(0); setOppScore(0);
      setMyCombo(0); setOppCombo(0);
      setAnswered(false); setFeedback(null);
      setPhase(PHASE.BATTLE);
      resetQTimer();
    });

    sock.on('answer_result', ({
      correct, pts, combo, explanation,
      myScore: ms, opponentScore: os,
      nextQuestion, nextIdx,
    }) => {
      clearQTimer();
      setMyScore(ms);
      setMyCombo(combo || 0);
      setFeedback({ correct, pts, combo, explanation });
      setAnswered(true);

      if (correct && pts > 0) {
        setOppHit(true); setTimeout(() => setOppHit(false), 700);
        setScoreFlash(true); setTimeout(() => setScoreFlash(false), 800);
        if ((combo || 0) >= 2) {
          setComboFlash(true); setTimeout(() => setComboFlash(false), 900);
        }
      }

      setTimeout(() => {
        setFeedback(null); setAnswered(false);
        if (nextQuestion && nextIdx >= 0) {
          setQuestion(nextQuestion);
          setQuestionIdx(nextIdx);
          resetQTimer();
        }
      }, ANSWER_DELAY);
    });

    sock.on('opponent_scored', ({ opponentScore, opponentQ, combo }) => {
      setOppScore(opponentScore);
      setOppCombo(combo || 0);
      setMyHit(true); setTimeout(() => setMyHit(false), 700);
    });

    sock.on('game_over', (data) => {
      clearQTimer();
      setResult(data);
      setPhase(PHASE.RESULT);
      // Award XP in game context
      if (data.xpEarned && addXP) addXP(data.xpEarned);
    });

    return () => {
      clearQTimer();
      sock.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────────────────── */
  /* Actions                                                     */
  /* ─────────────────────────────────────────────────────────── */
  const joinQueue = () => {
    socketRef.current?.emit('join_queue', {
      username: user?.username || 'Operator',
      level:    user?.level    || 1,
      userId:   user?._id,
    });
  };

  const createInviteRoom = () => {
    setInviteError('');
    socketRef.current?.emit('create_invite_room', {
      username: user?.username || 'Operator',
      level:    user?.level    || 1,
      userId:   user?._id,
    });
  };

  const joinInviteRoom = () => {
    if (!codeInput.trim()) { setInviteError('Enter a room code.'); return; }
    setInviteError('');
    socketRef.current?.emit('join_invite_room', {
      code:     codeInput.trim().toUpperCase(),
      username: user?.username || 'Operator',
      level:    user?.level    || 1,
      userId:   user?._id,
    });
  };

  const startAIMatch = () => {
    socketRef.current?.emit('start_ai_match', {
      username:     user?.username || 'Operator',
      level:        user?.level    || 1,
      userId:       user?._id,
      aiDifficulty,
    });
  };

  const submitAnswer = (answerIdx) => {
    if (answered || !question || !roomId) return;
    const responseTimeMs = Date.now() - (startTimeRef.current || Date.now());
    setAnswered(true);
    socketRef.current?.emit('submit_answer', {
      roomId, questionIdx, answerIdx, responseTimeMs,
    });
  };

  const leaveQueue = () => {
    socketRef.current?.emit('leave_queue');
    setPhase(PHASE.LOBBY);
  };

  const resetToLobby = () => {
    setPhase(PHASE.LOBBY);
    setResult(null);
    setInviteCode('');
    setCodeInput('');
    setInviteError('');
    setMyScore(0); setOppScore(0);
    setMyCombo(0); setOppCombo(0);
  };

  /* ─────────────────────────────────────────────────────────── */
  /* Derived                                                     */
  /* ─────────────────────────────────────────────────────────── */
  const opponent    = opponents[0] ?? null;
  const timerPct    = (qTimer / Q_TIME) * 100;
  const timerDanger = qTimer <= 5;
  const mySocketRef = mySocketId || socketRef.current?.id;

  /* ═══════════════════════════════════════════════════════════
     RENDER — Lobby
     ═══════════════════════════════════════════════════════════ */
  if (phase === PHASE.LOBBY) {
    return (
      <div className="mb-layout">
        <Sidebar />
        <main className="mb-main">
          <div className="mb-hero">
            <div className="mb-hero-glow" />
            <h1 className="mb-title">⚔️ CYBER BATTLE ARENA</h1>
            <p className="mb-subtitle">Real-time PvP cybersecurity combat</p>
          </div>

          {/* Mode selector */}
          <div className="mb-mode-tabs">
            {[
              { id: 'quick',  label: '⚡ Quick Match',    desc: 'Matched with a random opponent' },
              { id: 'invite', label: '🔗 Invite Friend',  desc: 'Share a room code'              },
              { id: 'ai',     label: '🤖 Practice vs AI', desc: 'Sharpen skills offline'         },
            ].map(m => (
              <button
                key={m.id}
                className={`mb-mode-tab${mode === m.id ? ' active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="mb-mode-label">{m.label}</span>
                <span className="mb-mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Quick Match */}
          {mode === 'quick' && (
            <div className="mb-action-panel">
              <p className="mb-action-info">
                Join the global matchmaking queue. You'll be paired with the next available player.
              </p>
              <button className="mb-btn-primary" onClick={joinQueue}>
                ⚔️ Find Opponent
              </button>
            </div>
          )}

          {/* Invite Friend */}
          {mode === 'invite' && (
            <div className="mb-action-panel">
              <div className="mb-invite-split">
                {/* Create */}
                <div className="mb-invite-half">
                  <h3 className="mb-invite-heading">Create Room</h3>
                  <p className="mb-action-info">Generate a code and share it with your friend.</p>
                  <button className="mb-btn-primary" onClick={createInviteRoom}>
                    🔗 Create Room
                  </button>
                </div>
                <div className="mb-invite-divider" />
                {/* Join */}
                <div className="mb-invite-half">
                  <h3 className="mb-invite-heading">Join Room</h3>
                  <p className="mb-action-info">Enter the 6-character code from your friend.</p>
                  <input
                    className="mb-code-input"
                    placeholder="ENTER CODE"
                    maxLength={6}
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && joinInviteRoom()}
                  />
                  <button className="mb-btn-primary" onClick={joinInviteRoom}>
                    🚪 Join Room
                  </button>
                </div>
              </div>
              {inviteError && <p className="mb-error">{inviteError}</p>}
            </div>
          )}

          {/* Practice vs AI */}
          {mode === 'ai' && (
            <div className="mb-action-panel">
              <p className="mb-action-info">Choose opponent difficulty:</p>
              <div className="mb-ai-diff-row">
                {['easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    className={`mb-diff-pill${aiDifficulty === d ? ' active' : ''}`}
                    onClick={() => setAiDifficulty(d)}
                  >
                    {d === 'easy' ? '🟢 Trainee' : d === 'medium' ? '🟡 CyberBot' : '🔴 Elite'}
                  </button>
                ))}
              </div>
              <button className="mb-btn-primary" onClick={startAIMatch}>
                🤖 Start Practice
              </button>
            </div>
          )}

          {/* Stats strip */}
          <div className="mb-stats-row">
            <div className="mb-stat-chip">🏆 Wins: {user?.multiplayerWins ?? 0}</div>
            <div className="mb-stat-chip">💀 Losses: {user?.multiplayerLosses ?? 0}</div>
            <div className="mb-stat-chip">⭐ Level: {user?.level ?? 1}</div>
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER — Queue searching
     ═══════════════════════════════════════════════════════════ */
  if (phase === PHASE.QUEUE) {
    return (
      <div className="mb-layout">
        <Sidebar />
        <main className="mb-main mb-center">
          <div className="mb-queue-pulse" />
          <h2 className="mb-queue-title">Searching for opponent…</h2>
          <p className="mb-queue-pos">Queue position: <strong>{queuePos}</strong></p>
          <div className="mb-queue-dots">
            <span /><span /><span />
          </div>
          <button className="mb-btn-ghost" onClick={leaveQueue}>Cancel</button>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER — Invite waiting room
     ═══════════════════════════════════════════════════════════ */
  if (phase === PHASE.WAITING) {
    return (
      <div className="mb-layout">
        <Sidebar />
        <main className="mb-main mb-center">
          <h2 className="mb-queue-title">Room Created!</h2>
          <p className="mb-action-info">Share this code with your friend:</p>
          <div className="mb-code-display">{inviteCode}</div>
          <p className="mb-action-info" style={{ opacity: 0.6, marginTop: 8 }}>
            Waiting for them to join…
          </p>
          <div className="mb-queue-dots"><span /><span /><span /></div>
          <button className="mb-btn-ghost" onClick={resetToLobby}>Cancel</button>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER — Battle
     ═══════════════════════════════════════════════════════════ */
  if (phase === PHASE.BATTLE) {
    const oppName = opponent?.username ?? (opponent?.isAI ? 'CyberBot 🤖' : 'Opponent');

    return (
      <div className="mb-layout">
        <Sidebar />
        <main className="mb-battle-arena">

          {/* ── Score panels ──────────────────────────────── */}
          <div className="mb-panels-row">

            {/* My panel */}
            <div className={`mb-panel mb-panel-me${myHit ? ' mb-panel-hit' : ''}`}>
              <div className="mb-panel-avatar">🧑‍💻</div>
              <div className="mb-panel-name">{user?.username ?? 'You'}</div>
              <div
                className={`mb-panel-score${scoreFlash ? ' mb-score-flash' : ''}`}
                style={{ color: scoreColor(myScore, oppScore) }}
              >
                {myScore}
              </div>
              <div className="mb-panel-label">PTS</div>
              {myCombo >= 2 && (
                <div className={`mb-combo-badge${comboFlash ? ' mb-combo-flash' : ''}`}>
                  🔥 ×{myCombo} COMBO
                </div>
              )}
              <div className="mb-panel-status mb-status-online">● ONLINE</div>
            </div>

            {/* Center: question + timer */}
            <div className="mb-center-panel">
              {/* Timer bar */}
              <div className="mb-timer-wrap">
                <div className="mb-timer-label">
                  Q {questionIdx + 1} / {totalQ}
                </div>
                <div className="mb-timer-bar-bg">
                  <div
                    className={`mb-timer-bar${timerDanger ? ' mb-timer-danger' : ''}`}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
                <span className={`mb-timer-num${timerDanger ? ' mb-timer-danger-text' : ''}`}>
                  {qTimer}s
                </span>
              </div>

              {/* Question */}
              {question ? (
                <div className="mb-question-card">
                  <div className="mb-q-type-badge">{question.type?.toUpperCase()}</div>
                  <p className="mb-question-text">{question.prompt}</p>

                  <div className="mb-choices-grid">
                    {question.choices.map((choice, idx) => {
                      let cls = 'mb-choice-btn';
                      if (feedback) {
                        if (idx === question.correct)       cls += ' mb-choice-correct';
                        else if (answered)                  cls += ' mb-choice-wrong';
                      }
                      return (
                        <button
                          key={idx}
                          className={cls}
                          disabled={answered}
                          onClick={() => submitAnswer(idx)}
                        >
                          <span className="mb-choice-letter">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {choice}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback overlay */}
                  {feedback && (
                    <div className={`mb-feedback${feedback.correct ? ' mb-fb-correct' : ' mb-fb-wrong'}`}>
                      <div className="mb-fb-icon">{feedback.correct ? '✔' : '✘'}</div>
                      <div className="mb-fb-pts">
                        {feedback.correct ? `+${feedback.pts} pts` : 'No points'}
                        {feedback.combo >= 3 && (
                          <span className="mb-fb-combo">🔥 ×{feedback.combo} combo!</span>
                        )}
                      </div>
                      <div className="mb-fb-explain">{feedback.explanation}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-waiting-next">Waiting for next question…</div>
              )}
            </div>

            {/* Opponent panel */}
            <div className={`mb-panel mb-panel-opp${oppHit ? ' mb-panel-hit' : ''}`}>
              <div className="mb-panel-avatar">{opponent?.isAI ? '🤖' : '🧑‍💻'}</div>
              <div className="mb-panel-name">{oppName}</div>
              <div
                className="mb-panel-score"
                style={{ color: scoreColor(oppScore, myScore) }}
              >
                {oppScore}
              </div>
              <div className="mb-panel-label">PTS</div>
              {oppCombo >= 2 && (
                <div className="mb-combo-badge">
                  🔥 ×{oppCombo} COMBO
                </div>
              )}
              <div className="mb-panel-status mb-status-online">● ONLINE</div>
            </div>
          </div>

          {/* VS divider */}
          <div className="mb-vs-line">
            <span className="mb-vs-badge">VS</span>
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER — Result screen
     ═══════════════════════════════════════════════════════════ */
  if (phase === PHASE.RESULT && result) {
    const isWin  = result.myOutcome === 'win';
    const isDraw = result.myOutcome === 'draw';
    const isDisconnect = result.reason === 'opponent_disconnected';

    const myData  = result.players?.[mySocketRef] ?? {};
    const oppData = Object.entries(result.players ?? {})
      .find(([sid]) => sid !== mySocketRef)?.[1] ?? {};

    return (
      <div className="mb-layout">
        <Sidebar />
        <main className="mb-main mb-center">
          {/* Outcome header */}
          <div className={`mb-result-header ${isWin ? 'mb-result-win' : isDraw ? 'mb-result-draw' : 'mb-result-loss'}`}>
            <div className="mb-result-icon">
              {isWin ? '🏆' : isDraw ? '🤝' : '💀'}
            </div>
            <h2 className="mb-result-title">
              {isWin ? 'VICTORY!' : isDraw ? 'DRAW' : 'DEFEATED'}
            </h2>
            {isDisconnect && (
              <p className="mb-result-sub">Opponent disconnected — automatic win!</p>
            )}
          </div>

          {/* Score cards */}
          <div className="mb-result-scores">
            <div className="mb-result-card mb-result-me">
              <div className="mb-rc-name">{user?.username ?? 'You'}</div>
              <div className="mb-rc-score">{result.finalScore ?? myData.score ?? myScore}</div>
              <div className="mb-rc-label">points</div>
              <div className="mb-rc-stat">Accuracy: {result.accuracy ?? '--'}%</div>
            </div>

            <div className="mb-result-vs">VS</div>

            <div className="mb-result-card mb-result-opp">
              <div className="mb-rc-name">
                {opponents[0]?.username ?? oppData.username ?? 'Opponent'}
              </div>
              <div className="mb-rc-score">{oppData.score ?? oppScore}</div>
              <div className="mb-rc-label">points</div>
              <div className="mb-rc-stat">
                {opponents[0]?.isAI ? '🤖 AI Opponent' : ''}
              </div>
            </div>
          </div>

          {/* XP reward */}
          {result.xpEarned > 0 && (
            <div className="mb-xp-reward">
              <span className="mb-xp-icon">⚡</span>
              +{result.xpEarned} XP Earned
              {isWin && <span className="mb-xp-bonus"> (Victory Bonus!)</span>}
            </div>
          )}

          {/* Badges */}
          <div className="mb-reward-badges">
            {isWin && <div className="mb-badge-chip">🥇 Winner</div>}
            {result.accuracy >= 80 && <div className="mb-badge-chip">🎯 Sharpshooter</div>}
            {matchMode === 'ai' && <div className="mb-badge-chip">🤖 Cyber Cadet</div>}
          </div>

          {/* Actions */}
          <div className="mb-result-actions">
            <button className="mb-btn-primary" onClick={resetToLobby}>
              ⚔️ Play Again
            </button>
            <button className="mb-btn-ghost" onClick={() => navigate('/leaderboard')}>
              📊 Leaderboard
            </button>
            <button className="mb-btn-ghost" onClick={() => navigate('/dashboard')}>
              🏠 Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default MultiplayerBattle;
