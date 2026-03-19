import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { fireConfetti, playSound } from '../../utils/gameEffects';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/battleArena.css';

const SOCKET_URL   = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
const ANSWER_DELAY = 1800; // ms to show feedback before next question

/* ── Phase enum ──────────────────────────────────────────────── */
const PHASE = { LOBBY: 'lobby', QUEUE: 'queue', BATTLE: 'battle', RESULT: 'result' };

/* ── Answer timer per question (s) ──────────────────────────── */
const Q_TIME = 15;

const BattleArena = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const socketRef  = useRef(null);

  const [phase,          setPhase]          = useState(PHASE.LOBBY);
  const [roomId,         setRoomId]         = useState(null);
  const [myId,           setMyId]           = useState(null);
  const [opponents,      setOpponents]      = useState([]);   // [{ socketId, username, level }]
  const [question,       setQuestion]       = useState(null);
  const [questionIdx,    setQuestionIdx]    = useState(0);
  const [totalQ,         setTotalQ]         = useState(0);
  const [myScore,        setMyScore]        = useState(0);
  const [oppScore,       setOppScore]       = useState(0);
  const [feedback,       setFeedback]       = useState(null); // { correct, pts, explanation }
  const [answered,       setAnswered]       = useState(false);
  const [qTimer,         setQTimer]         = useState(Q_TIME);
  const [attackEffect,   setAttackEffect]   = useState(null); // 'glitch' | 'shake'
  const [result,         setResult]         = useState(null); // { myOutcome, players, winnerId }
  const [queuePos,       setQueuePos]       = useState(0);

  const timerRef    = useRef(null);
  const startTimeRef = useRef(null);

  // ── Connect socket ────────────────────────────────────────────
  useEffect(() => {
    const sock = io(`${SOCKET_URL}/battle`, { transports: ['websocket'] });
    socketRef.current = sock;
    setMyId(sock.id);

    sock.on('connect',          () => setMyId(sock.id));
    sock.on('queue_joined',     ({ position }) => setQueuePos(position));

    sock.on('match_found', ({ roomId: rid, opponents: opps, question: q, questionIdx: qi,
      totalQuestions, durationMs }) => {
      setRoomId(rid);
      setOpponents(opps);
      setQuestion(q);
      setQuestionIdx(qi);
      setTotalQ(totalQuestions);
      setMyScore(0);
      setOppScore(0);
      setAnswered(false);
      setFeedback(null);
      setPhase(PHASE.BATTLE);
      resetQTimer();
    });

    sock.on('answer_result', ({ correct, pts, explanation, myScore: ms, opponentScore: os,
      nextQuestion, nextIdx }) => {
      setMyScore(ms);
      setFeedback({ correct, pts, explanation });
      setAnswered(true);
      clearQTimer();

      // Trigger visual attack effect on opponent panel when we score
      if (correct && pts > 0) {
        setAttackEffect('opponent-hit');
        setTimeout(() => setAttackEffect(null), 700);
      }

      // Advance to next question after delay
      setTimeout(() => {
        setFeedback(null);
        setAnswered(false);
        if (nextQuestion && nextIdx >= 0) {
          setQuestion(nextQuestion);
          setQuestionIdx(nextIdx);
          resetQTimer();
        }
      }, ANSWER_DELAY);
    });

    sock.on('opponent_scored', ({ opponentScore }) => {
      setOppScore(opponentScore);
      // "Malware" attack shake on our panel
      setAttackEffect('self-hit');
      setTimeout(() => setAttackEffect(null), 600);
    });

    sock.on('game_over', (data) => {
      clearQTimer();
      setResult(data);
      setPhase(PHASE.RESULT);
      if (data.myOutcome === 'win') {
        playSound('rankup');
        fireConfetti();
      } else {
        playSound('badge');
      }
    });

    return () => { sock.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Q timer ──────────────────────────────────────────────────
  const clearQTimer = () => { clearInterval(timerRef.current); };

  const resetQTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setQTimer(Q_TIME);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setQTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit timeout as wrong
          handleAnswer(-1, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Answer submission ─────────────────────────────────────────
  const handleAnswer = useCallback((answerIdx, timeout = false) => {
    if (answered || !roomId || !question) return;
    setAnswered(true);
    clearQTimer();
    const responseTimeMs = timeout ? Q_TIME * 1000 : Date.now() - (startTimeRef.current || Date.now());
    socketRef.current.emit('submit_answer', {
      roomId,
      questionIdx,
      answerIdx,
      responseTimeMs,
    });
  }, [answered, roomId, question, questionIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join queue ────────────────────────────────────────────────
  const joinQueue = () => {
    setPhase(PHASE.QUEUE);
    socketRef.current.emit('join_queue', {
      username: user?.username || 'Operator',
      level:    user?.level    || 1,
    });
  };

  const leaveQueue = () => {
    socketRef.current.emit('leave_queue');
    setPhase(PHASE.LOBBY);
  };

  const playAgain = () => {
    setResult(null);
    setPhase(PHASE.LOBBY);
    setMyScore(0);
    setOppScore(0);
  };

  // ── Derived ───────────────────────────────────────────────────
  const me       = opponents.find(p => p.socketId === myId)         || { username: user?.username || 'You',      level: user?.level || 1 };
  const opponent = opponents.find(p => p.socketId !== myId)         || { username: 'Opponent', level: '?' };
  const qPct     = question?.choices ? ((qTimer / Q_TIME) * 100)   : 100;
  const myPct    = totalQ ? Math.min(100, Math.round((myScore  / (totalQ * 30)) * 100)) : 0;
  const oppPct   = totalQ ? Math.min(100, Math.round((oppScore / (totalQ * 30)) * 100)) : 0;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main battle-main">

        {/* ── LOBBY ───────────────────────────────────────────── */}
        {phase === PHASE.LOBBY && (
          <div className="battle-lobby">
            <div className="battle-lobby-icon">⚔️</div>
            <h1 className="battle-lobby-title">Cyber Battle Arena</h1>
            <p className="battle-lobby-sub">
              Compete live against another operator. Answer cybersecurity
              challenges faster and more accurately to win.
            </p>

            <div className="battle-modes">
              {[
                { icon: '🎣', title: 'Phishing Speed Battle',   desc: 'Race to spot malicious emails before your opponent' },
                { icon: '🛡️', title: 'Cyber Defense Duel',      desc: 'Choose the right incident response under pressure' },
                { icon: '🏆', title: 'Mixed Challenge',          desc: 'All attack types — highest score after 8 rounds wins' },
              ].map(m => (
                <div key={m.title} className="battle-mode-card">
                  <span className="battle-mode-icon">{m.icon}</span>
                  <div className="battle-mode-title">{m.title}</div>
                  <div className="battle-mode-desc">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="battle-stats-row">
              <div className="battle-stat"><span className="battle-stat-val">{user?.level || 1}</span><span className="battle-stat-lbl">Your Level</span></div>
              <div className="battle-stat"><span className="battle-stat-val">{user?.multiplayerWins || 0}</span><span className="battle-stat-lbl">Wins</span></div>
              <div className="battle-stat"><span className="battle-stat-val">{user?.gamesCompleted || 0}</span><span className="battle-stat-lbl">Games</span></div>
            </div>

            <button className="battle-play-btn" onClick={joinQueue}>
              ⚔️ Find Opponent
            </button>
            <button className="battle-back-btn" onClick={() => navigate('/cyber-games')}>
              ← Back to Games
            </button>
          </div>
        )}

        {/* ── QUEUE ───────────────────────────────────────────── */}
        {phase === PHASE.QUEUE && (
          <div className="battle-searching">
            <div className="battle-search-spinner">
              <div className="battle-spinner-ring" />
              <span className="battle-spinner-icon">⚔️</span>
            </div>
            <h2 className="battle-search-title">Searching for Opponent…</h2>
            <p className="battle-search-sub">Matching by skill level • Queue position: {queuePos}</p>
            <button className="battle-cancel-btn" onClick={leaveQueue}>Cancel</button>
          </div>
        )}

        {/* ── BATTLE ──────────────────────────────────────────── */}
        {phase === PHASE.BATTLE && question && (
          <div className="battle-arena">

            {/* ── Header: scores + timer ── */}
            <div className="battle-header">
              <div className="battle-player-header">
                <span className="battle-player-avatar">🧑‍💻</span>
                <span className="battle-player-name">{me.username}</span>
                <span className="battle-player-score">{myScore}</span>
              </div>

              <div className="battle-center-timer">
                <div className="battle-timer-num">{qTimer}</div>
                <div className="battle-timer-bar-track">
                  <div
                    className={`battle-timer-bar-fill ${qTimer <= 5 ? 'battle-timer-danger' : ''}`}
                    style={{ width: `${qPct}%` }}
                  />
                </div>
                <div className="battle-q-counter">{questionIdx + 1} / {totalQ}</div>
              </div>

              <div className="battle-player-header battle-player-header--opp">
                <span className="battle-player-score">{oppScore}</span>
                <span className="battle-player-name">{opponent.username}</span>
                <span className="battle-player-avatar">🎯</span>
              </div>
            </div>

            {/* ── Health / score bars ── */}
            <div className="battle-bars">
              <div className={`battle-bar-wrap ${attackEffect === 'self-hit' ? 'battle-shake' : ''}`}>
                <div className="battle-bar-track">
                  <div className="battle-bar-fill battle-bar-fill--me" style={{ width: `${myPct}%` }} />
                </div>
              </div>
              <div className="battle-vs">VS</div>
              <div className={`battle-bar-wrap ${attackEffect === 'opponent-hit' ? 'battle-glitch' : ''}`}>
                <div className="battle-bar-track">
                  <div className="battle-bar-fill battle-bar-fill--opp" style={{ width: `${oppPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── Question ── */}
            <div className="battle-question-card">
              <div className="battle-q-type">{question.type === 'phishing' ? '🎣 Phishing Detection' : '🛡️ Incident Response'}</div>
              <p className="battle-q-text">{question.prompt}</p>

              {/* Answer feedback overlay */}
              {feedback && (
                <div className={`battle-feedback ${feedback.correct ? 'battle-feedback--correct' : 'battle-feedback--wrong'}`}>
                  <span className="battle-feedback-icon">{feedback.correct ? '✅' : '❌'}</span>
                  <span className="battle-feedback-pts">{feedback.correct ? `+${feedback.pts} pts` : 'Wrong!'}</span>
                  <span className="battle-feedback-exp">{feedback.explanation}</span>
                </div>
              )}

              {/* Choices */}
              <div className="battle-choices">
                {question.choices.map((choice, i) => {
                  let cls = 'battle-choice';
                  if (answered && feedback) {
                    if (i === question.correct) cls += ' battle-choice--correct';
                    else if (answered)          cls += ' battle-choice--wrong';
                  }
                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => handleAnswer(i)}
                      disabled={answered}
                    >
                      <span className="battle-choice-letter">{String.fromCharCode(65 + i)}</span>
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT ──────────────────────────────────────────── */}
        {phase === PHASE.RESULT && result && (
          <div className="battle-result">
            <div className={`battle-result-banner ${result.myOutcome === 'win' ? 'battle-result--win' : result.myOutcome === 'draw' ? 'battle-result--draw' : 'battle-result--loss'}`}>
              {result.myOutcome === 'win'  && <><span className="battle-result-emoji">🏆</span><h1>VICTORY!</h1></>}
              {result.myOutcome === 'loss' && <><span className="battle-result-emoji">💀</span><h1>DEFEAT</h1></>}
              {result.myOutcome === 'draw' && <><span className="battle-result-emoji">🤝</span><h1>DRAW</h1></>}
              {result.reason === 'opponent_disconnected' && <p className="battle-result-sub">Opponent disconnected — you win by forfeit</p>}
            </div>

            <div className="battle-scores-final">
              {Object.values(result.players || {}).map((p, i) => (
                <div key={i} className={`battle-score-card ${p.username === (user?.username || 'You') ? 'battle-score-card--me' : ''}`}>
                  <div className="battle-score-card-name">{p.username}</div>
                  <div className="battle-score-card-val">{p.score}</div>
                  <div className="battle-score-card-lbl">points</div>
                  {result.winnerId && p.socketId === result.winnerId && <div className="battle-score-card-badge">🏆 Winner</div>}
                </div>
              ))}
            </div>

            <div className="battle-result-actions">
              <button className="battle-play-btn" onClick={playAgain}>⚔️ Play Again</button>
              <button className="battle-back-btn" onClick={() => navigate('/cyber-games')}>← Games Hub</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default BattleArena;
