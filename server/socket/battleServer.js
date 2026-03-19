/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CyberMirror â”€ Multiplayer Battle Server v2  (socket.io)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Modes:
     quick  â€“ random-opponent matchmaking queue
     invite â€“ private room via 6-char room code
     ai     â€“ practice against a simulated CyberBot

   Events emitted BY client:
     join_queue          { username, level, userId }
     leave_queue
     create_invite_room  { username, level, userId }
     join_invite_room    { code, username, level, userId }
     start_ai_match      { username, level, userId, aiDifficulty }
     submit_answer       { roomId, questionIdx, answerIdx, responseTimeMs }
     disconnect          (automatic)

   Events emitted TO client:
     queue_joined        { position }
     invite_room_created { code }
     invite_error        { message }
     battle_error        { message }
     match_found         { roomId, mode, opponents, question,
                           questionIdx, totalQuestions, durationMs }
     answer_result       { correct, pts, combo, explanation,
                           myScore, opponentScore, nextQuestion, nextIdx }
     opponent_scored     { opponentScore, opponentQ, combo }
     game_over           { players, winnerId, myOutcome, accuracy,
                           xpEarned, finalScore, reason }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

let BattleRoom, User;
try { BattleRoom = require('../models/BattleRoom'); } catch { BattleRoom = null; }
try { User       = require('../models/User');       } catch { User = null; }

/* â”€â”€â”€ keep original QUESTIONS bank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const QUESTIONS = [
  { id: 1, type: 'phishing',
    prompt: 'Email from: security@paypa1-alert.com â€” "Urgent: account suspended. Click to verify."',
    choices: ['Phishing', 'Legitimate'],
    correct: 0,
    points: 20,
    explanation: 'paypa1 (digit 1) is a classic lookalike domain.' },
  { id: 2, type: 'phishing',
    prompt: 'Email from newsletter@spotify.com â€” "Your June recap is ready ðŸŽµ"',
    choices: ['Phishing', 'Legitimate'],
    correct: 1,
    points: 20,
    explanation: 'Spotify\'s real domain, non-urgent, expected content.' },
  { id: 3, type: 'phishing',
    prompt: 'Email from: it-helpdesk@company-support.net â€” "Reset password NOW or lose access in 24 h."',
    choices: ['Phishing', 'Legitimate'],
    correct: 0,
    points: 20,
    explanation: 'External domain impersonating internal IT + artificial urgency.' },
  { id: 4, type: 'defense',
    prompt: 'ALERT: 420 k req/sec hitting your web server from 1,200 IPs. What do you do?',
    choices: ['Enable rate limiting + CDN scrubbing', 'Reboot server', 'Block all traffic', 'Ignore'],
    correct: 0,
    points: 30,
    explanation: 'Rate limiting at the edge absorbs the flood without downtime.' },
  { id: 5, type: 'phishing',
    prompt: 'URL: https://g00gle-login.com/accounts â€” "Sign in to your Google account"',
    choices: ['Phishing', 'Legitimate'],
    correct: 0,
    points: 20,
    explanation: 'g00gle (zeros) is a lookalike domain â€” not google.com.' },
  { id: 6, type: 'defense',
    prompt: 'LOGIN: 47 failed SSH attempts from 185.220.101.45, then one success. Action?',
    choices: ['Revoke session + reset credentials', 'Monitor passively', 'Block IP only', 'Wait'],
    correct: 0,
    points: 30,
    explanation: 'Active session is still live â€” revoke first, then reset.' },
  { id: 7, type: 'phishing',
    prompt: 'Email from payroll@company.com â€” "Update banking details urgently."',
    choices: ['Phishing', 'Legitimate'],
    correct: 0,
    points: 20,
    explanation: 'Finance/payroll spoofing + urgent action = high-risk phishing.' },
  { id: 8, type: 'defense',
    prompt: '3.2 GB outbound traffic to 91.108.4.22 (Russia) in 20 minutes from DB server.',
    choices: ['Block outbound to flagged IP', 'Shut down DB server', 'Send warning email', 'Increase logging'],
    correct: 0,
    points: 30,
    explanation: 'Blocking the destination immediately stops the active data leak.' },
];

const MATCH_DURATION_MS = 90_000;   // 90 s per match
const AI_ID             = '__ai__'; // pseudo socket-id for the AI player

/* â”€â”€ In-memory state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const queue        = [];          // [{ socketId, username, level, userId }]
const rooms        = new Map();   // roomId â†’ RoomState
const inviteRooms  = new Map();   // code â†’ { hostInfo, code }
const activeUsers  = new Map();   // userId â†’ socketId  (multi-tab guard)

let roomCounter = 0;
const nextRoomId = () => `room_${++roomCounter}_${Date.now()}`;
const genCode    = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

const makePlayerEntry = (info) => ({
  ...info,
  score:         0,
  answers:       [],
  currentQ:      0,
  combo:         0,
  done:          false,
  questionStart: Date.now(),
});

const makeRoom = (p1Info, p2Info, mode = 'quick', inviteCode = null) => {
  const id        = nextRoomId();
  const questions = shuffle(QUESTIONS).slice(0, 8);
  const room = {
    id, mode, inviteCode,
    players: {
      [p1Info.socketId]: makePlayerEntry(p1Info),
      [p2Info.socketId]: makePlayerEntry(p2Info),
    },
    questions,
    startedAt:    Date.now(),
    timer:        null,
    finished:     false,
    aiDifficulty: null,
  };
  rooms.set(id, room);
  return room;
};

const getOpponent = (room, socketId) =>
  Object.values(room.players).find(p => p.socketId !== socketId);

const roomSummary = (room) => ({
  roomId: room.id,
  players: Object.fromEntries(
    Object.entries(room.players).map(([sid, p]) => [
      sid,
      { username: p.username, score: p.score, currentQ: p.currentQ, done: p.done },
    ])
  ),
  totalQuestions: room.questions.length,
});

/* â”€â”€ Combo multiplier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const comboMult = (combo) => {
  if (combo >= 4) return 1.5;
  if (combo >= 3) return 1.3;
  if (combo >= 2) return 1.15;
  return 1.0;
};

/* â”€â”€ XP rewards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const calcXP = (outcome, score, totalQ) => {
  const base  = outcome === 'win' ? 150 : outcome === 'draw' ? 80 : 40;
  const bonus = outcome === 'win' ? Math.min(50, Math.round(score / Math.max(1, totalQ * 3))) : 0;
  return base + bonus;
};

/* â”€â”€ Persist match to MongoDB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const persistMatch = async (room, winnerSocketId) => {
  if (!BattleRoom || !User) return;
  try {
    const playerArr = Object.values(room.players);
    const [p1, p2]  = playerArr;
    const isDraw    = winnerSocketId === null;

    const buildResult = (p) => {
      const outcome = p.isAI ? 'loss'
        : isDraw               ? 'draw'
        : p.socketId === winnerSocketId ? 'win' : 'loss';
      const correctCount  = p.answers.filter(a => a.correct).length;
      const totalAnswered = p.answers.length;
      const accuracy      = totalAnswered > 0
        ? Math.round((correctCount / totalAnswered) * 100) : 0;
      const avgResponseMs = totalAnswered > 0
        ? Math.round(p.answers.reduce((s, a) => s + (a.responseTimeMs || 0), 0) / totalAnswered) : 0;
      const xpEarned      = p.isAI ? 0 : calcXP(outcome, p.score, room.questions.length);
      return { p, outcome, correctCount, totalAnswered, accuracy, avgResponseMs, xpEarned };
    };

    const r1 = buildResult(p1);
    const r2 = buildResult(p2);
    const winnerUsername = isDraw ? null
      : winnerSocketId === p1.socketId ? p1.username : p2.username;

    await BattleRoom.create({
      roomId: room.id, mode: room.mode, inviteCode: room.inviteCode,
      winnerUsername, duration: Date.now() - room.startedAt,
      totalQuestions: room.questions.length,
      startedAt: new Date(room.startedAt), endedAt: new Date(), completed: true,
      players: [r1, r2].map(({ p, outcome, correctCount, totalAnswered, accuracy, avgResponseMs, xpEarned }) => ({
        userId: p.userId || undefined,
        username: p.username, score: p.score,
        accuracy, avgResponseMs, totalAnswered, correctCount,
        outcome, isAI: !!p.isAI, xpEarned,
      })),
    });

    // Award XP + win/loss counters on real users
    for (const { p, outcome, xpEarned } of [r1, r2]) {
      if (!p.userId || p.isAI) continue;
      try {
        const inc = { totalXP: xpEarned };
        if (outcome === 'win')  inc.multiplayerWins   = 1;
        if (outcome === 'loss') inc.multiplayerLosses = 1;
        await User.findByIdAndUpdate(p.userId, { $inc: inc });
      } catch { /* non-fatal */ }
    }
  } catch (e) {
    console.error('[BattleServer] persistMatch error:', e.message);
  }
};

/* â”€â”€ End a match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const endMatch = async (io, room) => {
  if (room.finished) return;
  room.finished = true;
  clearTimeout(room.timer);

  const [p1, p2] = Object.values(room.players);
  let winnerSocketId = null;
  if      (p1.score > p2.score) winnerSocketId = p1.socketId;
  else if (p2.score > p1.score) winnerSocketId = p2.socketId;
  const isDraw = winnerSocketId === null;

  persistMatch(room, winnerSocketId).catch(() => {});

  const summary = roomSummary(room);
  for (const p of [p1, p2]) {
    if (p.isAI) continue;
    const myOutcome = isDraw ? 'draw'
      : p.socketId === winnerSocketId ? 'win' : 'loss';
    const correctCount = p.answers.filter(a => a.correct).length;
    const accuracy     = p.answers.length > 0
      ? Math.round((correctCount / p.answers.length) * 100) : 0;
    io.to(p.socketId).emit('game_over', {
      players:    summary.players,
      winnerId:   winnerSocketId,
      myOutcome,  accuracy,
      finalScore: p.score,
      xpEarned:   calcXP(myOutcome, p.score, room.questions.length),
      reason:     'match_complete',
    });
  }
  rooms.delete(room.id);
};

/* â”€â”€ Core answer processor (shared human + AI) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const processAnswer = (io, room, socketId, { questionIdx, answerIdx, responseTimeMs = 0 }) => {
  const player = room.players[socketId];
  if (!player || player.done || room.finished) return;
  if (questionIdx !== player.currentQ) return;   // out-of-order guard

  // Clamp suspiciously fast times â€” humans can't answer in < 150 ms
  const elapsed = Date.now() - (player.questionStart || room.startedAt);
  const safems  = player.isAI ? responseTimeMs : Math.max(responseTimeMs, Math.min(elapsed, 90_000));

  const q       = room.questions[questionIdx];
  const correct = answerIdx === q.correct;

  player.combo = correct ? (player.combo || 0) + 1 : 0;
  const mult   = comboMult(player.combo);
  const rawPts = correct ? Math.max(5, q.points - Math.floor(safems / 1_000)) : 0;
  const pts    = correct ? Math.round(rawPts * mult) : 0;

  player.score    += pts;
  player.currentQ += 1;
  player.answers.push({ questionIdx, answerIdx, correct, pts, responseTimeMs: safems });

  const opponent = getOpponent(room, socketId);
  const nextIdx  = player.currentQ;
  const hasNext  = nextIdx < room.questions.length;
  if (hasNext) player.questionStart = Date.now();

  if (!player.isAI) {
    io.to(socketId).emit('answer_result', {
      correct, pts, combo: player.combo, explanation: q.explanation,
      myScore:       player.score,
      opponentScore: opponent?.score ?? 0,
      nextQuestion:  hasNext ? room.questions[nextIdx] : null,
      nextIdx:       hasNext ? nextIdx : -1,
    });

    if (opponent && !opponent.isAI) {
      // Try both namespace and raw io.to()
      const oppSock = io.sockets?.get(opponent.socketId);
      if (oppSock) {
        oppSock.emit('opponent_scored', {
          opponentScore: player.score, opponentQ: player.currentQ, combo: player.combo,
        });
      }
    }
  }

  if (!hasNext) {
    player.done = true;
    if (Object.values(room.players).every(p => p.done)) endMatch(io, room);
  }
};

/* â”€â”€ AI simulation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const AI_ACCURACY = { easy: 0.35, medium: 0.60, hard: 0.85 };
const AI_DELAYS   = { easy: [3500, 8000], medium: [2000, 5500], hard: [800, 3000] };

const scheduleAIAnswer = (io, room, qIdx) => {
  if (room.finished || qIdx >= room.questions.length) return;
  const diff      = room.aiDifficulty || 'medium';
  const [lo, hi]  = AI_DELAYS[diff];
  const delay     = Math.round(lo + Math.random() * (hi - lo));

  setTimeout(() => {
    if (room.finished) return;
    const q         = room.questions[qIdx];
    const correct   = Math.random() < AI_ACCURACY[diff];
    const answerIdx = correct ? q.correct
      : (q.correct + 1 + Math.floor(Math.random() * (q.choices.length - 1))) % q.choices.length;

    processAnswer(io, room, AI_ID, { questionIdx: qIdx, answerIdx, responseTimeMs: delay });

    const ai = room.players[AI_ID];
    if (ai && !ai.done && !room.finished) scheduleAIAnswer(io, room, ai.currentQ);
  }, delay);
};

/* â”€â”€ emit match_found to human players â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const emitMatchFound = (io, room) => {
  const [p1, p2]  = Object.values(room.players);
  const firstQ    = room.questions[0];
  const base = { roomId: room.id, mode: room.mode, question: firstQ,
                 questionIdx: 0, totalQuestions: room.questions.length,
                 durationMs: MATCH_DURATION_MS };

  const toPlayer = (me, opp) => ({
    ...base,
    opponents: [{
      socketId: opp.socketId, username: opp.username,
      level: opp.level, isAI: !!opp.isAI,
    }],
  });

  if (!p1.isAI) io.to(p1.socketId).emit('match_found', toPlayer(p1, p2));
  if (!p2.isAI) io.to(p2.socketId).emit('match_found', toPlayer(p2, p1));
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Main export
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const initBattleServer = (io) => {
  const battleNS = io.of('/battle');

  battleNS.on('connection', (socket) => {

    /* â”€â”€ join_queue  (Quick Match) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('join_queue', ({ username = 'Operator', level = 1, userId } = {}) => {
      // Multi-tab guard
      if (userId && activeUsers.has(userId) && activeUsers.get(userId) !== socket.id) {
        socket.emit('battle_error', { message: 'You already have an active battle in another tab.' });
        return;
      }
      if (userId) activeUsers.set(userId, socket.id);

      const existing = queue.findIndex(p => p.socketId === socket.id);
      if (existing !== -1) queue.splice(existing, 1);

      queue.push({ socketId: socket.id, username, level, userId: userId || null });
      socket.emit('queue_joined', { position: queue.length });

      if (queue.length >= 2) {
        const [p1Info, p2Info] = [queue.shift(), queue.shift()];
        const room = makeRoom(p1Info, p2Info, 'quick');

        [p1Info, p2Info].forEach(p => {
          const s = battleNS.sockets.get(p.socketId);
          if (s) s.join(room.id);
        });

        emitMatchFound(battleNS, room);
        room.timer = setTimeout(() => endMatch(battleNS, room), MATCH_DURATION_MS);
      }
    });

    /* â”€â”€ create_invite_room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('create_invite_room', ({ username = 'Operator', level = 1, userId } = {}) => {
      const code = genCode();
      inviteRooms.set(code, {
        hostInfo: { socketId: socket.id, username, level, userId: userId || null },
        code,
      });
      socket.emit('invite_room_created', { code });
      // Auto-expire after 5 min
      setTimeout(() => inviteRooms.delete(code), 5 * 60 * 1_000);
    });

    /* â”€â”€ join_invite_room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('join_invite_room', ({ code = '', username = 'Operator', level = 1, userId } = {}) => {
      const invite = inviteRooms.get(code.toUpperCase());
      if (!invite) { socket.emit('invite_error', { message: 'Room code not found or expired.' }); return; }
      if (invite.hostInfo.socketId === socket.id) { socket.emit('invite_error', { message: "You can't join your own room." }); return; }

      inviteRooms.delete(code.toUpperCase());

      const p1Info = invite.hostInfo;
      const p2Info = { socketId: socket.id, username, level, userId: userId || null };
      const room   = makeRoom(p1Info, p2Info, 'invite', code.toUpperCase());

      [p1Info, p2Info].forEach(p => {
        const s = battleNS.sockets.get(p.socketId);
        if (s) s.join(room.id);
      });

      emitMatchFound(battleNS, room);
      room.timer = setTimeout(() => endMatch(battleNS, room), MATCH_DURATION_MS);
    });

    /* â”€â”€ start_ai_match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('start_ai_match', ({
      username = 'Operator', level = 1, userId, aiDifficulty = 'medium',
    } = {}) => {
      const humanInfo = { socketId: socket.id, username, level, userId: userId || null };
      const botName   = aiDifficulty === 'hard' ? 'EliteBot ðŸ’€'
        : aiDifficulty === 'easy'               ? 'TraineeBot ðŸ¤–' : 'CyberBot ðŸ¤–';
      const aiInfo    = {
        socketId: AI_ID,
        username: botName,
        level:    aiDifficulty === 'hard' ? 10 : aiDifficulty === 'medium' ? 5 : 2,
        userId:   null,
        isAI:     true,
      };

      const room        = makeRoom(humanInfo, aiInfo, 'ai');
      room.aiDifficulty = aiDifficulty;

      socket.join(room.id);
      emitMatchFound(battleNS, room);
      scheduleAIAnswer(battleNS, room, 0);
      room.timer = setTimeout(() => endMatch(battleNS, room), MATCH_DURATION_MS);
    });

    /* â”€â”€ submit_answer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('submit_answer', ({ roomId, questionIdx, answerIdx, responseTimeMs = 0 }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      processAnswer(battleNS, room, socket.id, { questionIdx, answerIdx, responseTimeMs });
    });

    /* â”€â”€ leave_queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('leave_queue', () => {
      const idx = queue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    });

    /* â”€â”€ disconnect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    socket.on('disconnect', () => {
      const qi = queue.findIndex(p => p.socketId === socket.id);
      if (qi !== -1) queue.splice(qi, 1);

      for (const [code, inv] of inviteRooms) {
        if (inv.hostInfo.socketId === socket.id) inviteRooms.delete(code);
      }
      for (const [uid, sid] of activeUsers) {
        if (sid === socket.id) activeUsers.delete(uid);
      }

      for (const [, room] of rooms) {
        if (room.players[socket.id] && !room.finished) {
          room.finished = true;
          clearTimeout(room.timer);
          const winner = getOpponent(room, socket.id);
          if (winner && !winner.isAI) {
            const correctCount = winner.answers.filter(a => a.correct).length;
            const accuracy     = winner.answers.length > 0
              ? Math.round((correctCount / winner.answers.length) * 100) : 0;
            battleNS.to(winner.socketId).emit('game_over', {
              players:   roomSummary(room).players,
              winnerId:  winner.socketId,
              myOutcome: 'win', accuracy,
              xpEarned:  calcXP('win', winner.score, room.questions.length),
              reason:    'opponent_disconnected',
            });
          }
          persistMatch(room, winner?.socketId ?? null).catch(() => {});
          rooms.delete(room.id);
          break;
        }
      }
    });
  });
};

module.exports = { initBattleServer };

