/* ═══════════════════════════════════════════════════════════════
   tournamentController.js
   Full tournament lifecycle: create → register → bracket →
   live matches → completion → rewards
   ═══════════════════════════════════════════════════════════════ */
const Tournament      = require('../models/Tournament');
const TournamentMatch = require('../models/TournamentMatch');
const User            = require('../models/User');

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */

/** Shuffle an array in-place (Fisher–Yates). */
const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Next power-of-2 ≥ n. Used to calculate bye count. */
const nextPow2 = n => Math.pow(2, Math.ceil(Math.log2(n)));

/** Round name from round number and total. */
const roundLabel = (round, total) => {
  const fromEnd = total - round;
  if (fromEnd === 0) return 'Grand Final';
  if (fromEnd === 1) return 'Semi-Final';
  if (fromEnd === 2) return 'Quarter-Final';
  const playersLeft = Math.pow(2, total - round + 1);
  return `Round of ${playersLeft}`;
};

/** XP awarded per round win (scales with round depth). */
const roundXP = (roundNumber) => 25 + (roundNumber - 1) * 15;

/* ─────────────────────────────────────────────────────────────
   Bracket generation (single-elimination with byes)
   ─────────────────────────────────────────────────────────────
   1. Seed participants by totalXP desc.
   2. Pad to next power-of-2 with "bye" slots.
   3. Create TournamentMatch docs for round 1.
   4. Pre-create all subsequent round shells (player = TBD).
   ───────────────────────────────────────────────────────────── */
async function generateBracket(tournament) {
  const participants = [...tournament.participants];
  // Seed by user XP (already enriched from registration)
  participants.sort((a, b) => (b.seed || 0) - (a.seed || 0));

  const n       = participants.length;
  const slots   = nextPow2(n);
  const byes    = slots - n;
  const rounds  = Math.ceil(Math.log2(slots));

  tournament.totalRounds = rounds;
  tournament.currentRound = 1;

  // Interleave top seeds with byes so top seeds get the byes
  // Pair 1 vs last, 2 vs (last-1), etc. (standard seeding)
  const seeded = [];
  for (let i = 0; i < slots / 2; i++) {
    seeded.push(participants[i] || null);               // top half
    seeded.push(participants[slots - 1 - i] || null);  // bottom half
  }

  // Build round 1 matches
  const r1Matches = [];
  for (let m = 0; m < slots / 2; m++) {
    const p1 = seeded[m * 2];
    const p2 = seeded[m * 2 + 1];

    const isBye = !p2;
    const matchDoc = {
      tournamentId: tournament._id,
      roundNumber:  1,
      matchNumber:  m + 1,
      bracketSlot:  `R1-M${m + 1}`,
      player1: p1 ? { userId: p1.userId, username: p1.username } : { username: 'TBD' },
      player2: p2 ? { userId: p2.userId, username: p2.username } : { username: 'BYE', isBye: true },
      status:       isBye ? 'bye' : 'ready',
    };

    if (isBye && p1) {
      matchDoc.winnerId       = p1.userId;
      matchDoc.winnerUsername = p1.username;
      matchDoc.completedAt    = new Date();
    }

    r1Matches.push(matchDoc);
  }

  // Pre-create all later round shells (TBD players)
  const laterMatches = [];
  let matchesInRound = slots / 2;
  for (let r = 2; r <= rounds; r++) {
    matchesInRound = Math.ceil(matchesInRound / 2);
    for (let m = 1; m <= matchesInRound; m++) {
      laterMatches.push({
        tournamentId: tournament._id,
        roundNumber:  r,
        matchNumber:  m,
        bracketSlot:  `R${r}-M${m}`,
        status:       'pending',
      });
    }
  }

  await TournamentMatch.insertMany([...r1Matches, ...laterMatches]);

  // Advance bye winners immediately into round 2
  await advanceByeWinners(tournament._id, 1);

  tournament.status       = 'bracket_generated';
  tournament.currentRound = 1;
  await tournament.save();
}

/** After creating round r, auto-advance bye winners to round r+1 */
async function advanceByeWinners(tournamentId, round) {
  const byes = await TournamentMatch.find({
    tournamentId, roundNumber: round, status: 'bye',
  });
  for (const bye of byes) {
    await advanceWinner(tournamentId, round, bye.matchNumber, bye.winnerId, bye.winnerUsername);
  }
}

/** Slot winner into the correct match in the next round. */
async function advanceWinner(tournamentId, completedRound, matchNumber, winnerId, winnerUsername) {
  const nextRound    = completedRound + 1;
  const nextMatch    = Math.ceil(matchNumber / 2);
  const isPlayer1Slot = matchNumber % 2 === 1;

  const nextMatchDoc = await TournamentMatch.findOne({
    tournamentId, roundNumber: nextRound, matchNumber: nextMatch,
  });

  if (!nextMatchDoc) return; // final round completed

  const slot = isPlayer1Slot ? 'player1' : 'player2';
  nextMatchDoc[slot] = { userId: winnerId, username: winnerUsername };

  const p1Filled = nextMatchDoc.player1?.userId;
  const p2Filled = nextMatchDoc.player2?.userId;

  if (p1Filled && p2Filled) {
    nextMatchDoc.status = 'ready';
  } else if ((isPlayer1Slot && !p2Filled) || (!isPlayer1Slot && !p1Filled)) {
    // Only one player — could be a bye from odd count
    nextMatchDoc.status = 'pending';
  }

  await nextMatchDoc.save();
}

/* ─────────────────────────────────────────────────────────────
   CONTROLLER FUNCTIONS
   ───────────────────────────────────────────────────────────── */

/* GET /api/tournaments/active
   Returns upcoming + registration + live tournaments.            */
const getActiveTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({
      status: { $in: ['upcoming', 'registration', 'bracket_generated', 'live'] },
    })
      .sort({ startDate: 1 })
      .lean();

    // Annotate each tournament with the caller's registration status
    const userId = req.user?._id?.toString();
    const annotated = tournaments.map(t => ({
      ...t,
      participantCount: t.participants.length,
      isRegistered:     userId
        ? t.participants.some(p => p.userId?.toString() === userId)
        : false,
      spotsLeft: t.maxParticipants - t.participants.length,
      roundLabel: t.currentRound > 0
        ? roundLabel(t.currentRound, t.totalRounds)
        : 'Not started',
    }));

    res.json({ tournaments: annotated });
  } catch (err) { next(err); }
};

/* GET /api/tournaments/all
   All tournaments including completed, for history view.         */
const getAllTournaments = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [tournaments, total] = await Promise.all([
      Tournament.find().sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      Tournament.countDocuments(),
    ]);

    res.json({ tournaments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

/* GET /api/tournaments/:id
   Full tournament detail.                                        */
const getTournament = async (req, res, next) => {
  try {
    const t = await Tournament.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const userId = req.user?._id?.toString();
    res.json({
      tournament: {
        ...t,
        isRegistered: userId
          ? t.participants.some(p => p.userId?.toString() === userId)
          : false,
        participantCount: t.participants.length,
        spotsLeft: t.maxParticipants - t.participants.length,
      },
    });
  } catch (err) { next(err); }
};

/* POST /api/tournaments/join
   Register authenticated user into the tournament.              */
const joinTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (!['upcoming', 'registration'].includes(tournament.status)) {
      return res.status(400).json({ message: 'Registration is not open for this tournament.' });
    }
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ message: 'Tournament is full.' });
    }

    const alreadyIn = tournament.participants.some(
      p => p.userId?.toString() === req.user._id.toString()
    );
    if (alreadyIn) {
      return res.status(400).json({ message: 'Already registered.' });
    }

    const user = await User.findById(req.user._id).select('username totalXP level avatar');

    tournament.participants.push({
      userId:   user._id,
      username: user.username,
      seed:     user.totalXP || 0,
      avatar:   user.avatar  || '',
    });

    // Auto-open registration status
    if (tournament.status === 'upcoming') tournament.status = 'registration';

    await tournament.save();
    res.json({
      message:          'Successfully joined tournament!',
      participantCount: tournament.participants.length,
      spotsLeft:        tournament.maxParticipants - tournament.participants.length,
    });
  } catch (err) { next(err); }
};

/* POST /api/tournaments/leave
   Withdraw from a tournament before it starts.                  */
const leaveTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (!['upcoming', 'registration'].includes(tournament.status)) {
      return res.status(400).json({ message: 'Cannot withdraw once tournament has started.' });
    }

    tournament.participants = tournament.participants.filter(
      p => p.userId?.toString() !== req.user._id.toString()
    );
    await tournament.save();
    res.json({ message: 'Withdrawn from tournament.' });
  } catch (err) { next(err); }
};

/* POST /api/tournaments/:id/generate-bracket  (admin / cron)
   Close registration and generate the bracket.                  */
const generateBracketEndpoint = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (!['registration', 'upcoming'].includes(tournament.status)) {
      return res.status(400).json({ message: 'Bracket already generated or tournament completed.' });
    }
    if (tournament.participants.length < 2) {
      return res.status(400).json({ message: 'Need at least 2 participants.' });
    }

    await generateBracket(tournament);
    res.json({ message: 'Bracket generated successfully.', totalRounds: tournament.totalRounds });
  } catch (err) { next(err); }
};

/* GET /api/tournaments/brackets/:id
   Full bracket data for the visualiser.                         */
const getBracket = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id).lean();
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const matches = await TournamentMatch.find({ tournamentId: req.params.id })
      .sort({ roundNumber: 1, matchNumber: 1 })
      .lean();

    // Group by round
    const rounds = {};
    for (const m of matches) {
      const label = roundLabel(m.roundNumber, tournament.totalRounds);
      if (!rounds[m.roundNumber]) {
        rounds[m.roundNumber] = { roundNumber: m.roundNumber, label, matches: [] };
      }
      rounds[m.roundNumber].matches.push(m);
    }

    res.json({
      tournament,
      rounds:       Object.values(rounds),
      totalRounds:  tournament.totalRounds,
      currentRound: tournament.currentRound,
    });
  } catch (err) { next(err); }
};

/* POST /api/tournaments/match/:matchId/complete  (internal / socket)
   Record result for a tournament match & advance winner.        */
const completeMatch = async (req, res, next) => {
  try {
    const { winnerId, winnerUsername, p1Score, p2Score, p1Accuracy, p2Accuracy, durationMs } = req.body;
    const match = await TournamentMatch.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'completed') return res.status(400).json({ message: 'Already completed' });

    match.winnerId       = winnerId;
    match.winnerUsername = winnerUsername;
    match.status         = 'completed';
    match.completedAt    = new Date();
    match.durationMs     = durationMs || 0;
    match.player1.score  = p1Score    || 0;
    match.player2.score  = p2Score    || 0;
    match.player1.accuracy = p1Accuracy || 0;
    match.player2.accuracy = p2Accuracy || 0;
    match.winnerXP = roundXP(match.roundNumber);
    match.loserXP  = Math.floor(roundXP(match.roundNumber) / 3);

    await match.save();

    // Eliminate loser in Tournament participant list
    const loserId = match.player1.userId?.toString() === winnerId?.toString()
      ? match.player2.userId : match.player1.userId;

    await Tournament.updateOne(
      { _id: match.tournamentId, 'participants.userId': loserId },
      { $set: { 'participants.$.eliminated': true, 'participants.$.eliminatedAt': new Date() } }
    );

    // Award XP
    await User.findByIdAndUpdate(winnerId, { $inc: { totalXP: match.winnerXP } });
    if (loserId) await User.findByIdAndUpdate(loserId, { $inc: { totalXP: match.loserXP } });

    // Advance winner
    await advanceWinner(
      match.tournamentId, match.roundNumber, match.matchNumber, winnerId, winnerUsername
    );

    // Check if we just completed the final
    const tournament = await Tournament.findById(match.tournamentId);
    if (tournament) {
      const finalRound = tournament.totalRounds;
      if (match.roundNumber === finalRound) {
        await completeTournament(tournament, winnerId, winnerUsername);
      } else {
        // Check if all matches in this round are done → advance round counter
        const remainingInRound = await TournamentMatch.countDocuments({
          tournamentId: match.tournamentId,
          roundNumber:  match.roundNumber,
          status:       { $in: ['ready', 'pending', 'live'] },
        });
        if (remainingInRound === 0) {
          tournament.currentRound = match.roundNumber + 1;
          tournament.status = 'live';
          await tournament.save();
        }
      }
    }

    res.json({ message: 'Match completed.', winnerXP: match.winnerXP, loserXP: match.loserXP });
  } catch (err) { next(err); }
};

/* Finalize a tournament: award champion rewards, set status */
async function completeTournament(tournament, winnerId, winnerUsername) {
  tournament.status         = 'completed';
  tournament.endDate        = new Date();
  tournament.winnerId       = winnerId;
  tournament.winnerUsername = winnerUsername;

  // Award champion title + XP + badge
  const champion = tournament.rewards.find(r => r.place === '1st');
  if (champion) {
    const inc = { totalXP: champion.xpBonus || 500 };
    await User.findByIdAndUpdate(winnerId, { $inc: inc });
    // Could also push earnedBadge here if badge system is wired
  }

  // Snapshot top 10 for season record
  const top10 = tournament.participants
    .filter(p => !p.eliminated || p.userId?.toString() === winnerId?.toString())
    .slice(0, 10)
    .map(p => ({ userId: p.userId, username: p.username, wins: p.wins }));
  tournament.seasonSnapshot = top10;

  await tournament.save();
}

/* GET /api/tournaments/global-rankings
   Aggregate all completed tournament wins per user.             */
const getGlobalRankings = async (req, res, next) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    // Aggregate tournament wins from TournamentMatch
    const winAgg = await TournamentMatch.aggregate([
      { $match: { status: 'completed', winnerId: { $ne: null } } },
      { $group: { _id: '$winnerId', matchWins: { $sum: 1 } } },
    ]);

    const tourneyWins = await Tournament.aggregate([
      { $match: { status: 'completed', winnerId: { $ne: null } } },
      { $group: { _id: '$winnerId', tournamentWins: { $sum: 1 } } },
    ]);

    // Build lookup maps
    const matchWinMap     = Object.fromEntries(winAgg.map(x => [x._id.toString(), x.matchWins]));
    const tourneyWinMap   = Object.fromEntries(tourneyWins.map(x => [x._id.toString(), x.tournamentWins]));

    // Fetch top users by XP
    const users = await User.find({ role: 'user' })
      .select('username totalXP totalScore level earnedBadges multiplayerWins avatar')
      .sort({ totalXP: -1 })
      .limit(limit)
      .lean();

    const rankings = users.map((u, i) => {
      const uid    = u._id.toString();
      const tWins  = tourneyWinMap[uid] || 0;
      const mWins  = matchWinMap[uid]   || 0;

      // composite score: tournament wins × 1000 + match wins × 50 + XP
      const rankScore = tWins * 1000 + mWins * 50 + (u.totalXP || 0);
      return {
        rank:            i + 1,
        _id:             u._id,
        username:        u.username,
        avatar:          u.avatar        || '',
        totalXP:         u.totalXP       || 0,
        totalScore:      u.totalScore    || 0,
        level:           u.level         || 1,
        tournamentWins:  tWins,
        matchWins:       mWins,
        multiplayerWins: u.multiplayerWins || 0,
        earnedBadges:    u.earnedBadges  || [],
        rankScore,
      };
    });

    // Re-sort by composite rankScore
    rankings.sort((a, b) => b.rankScore - a.rankScore);
    rankings.forEach((r, i) => { r.rank = i + 1; });

    res.json({ rankings });
  } catch (err) { next(err); }
};

/* GET /api/tournaments/my-history
   All tournaments this user participated in.                    */
const getMyTournamentHistory = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({
      'participants.userId': req.user._id,
    }).sort({ startDate: -1 }).limit(30).lean();

    const history = tournaments.map(t => {
      const me = t.participants.find(p => p.userId?.toString() === req.user._id.toString());
      return {
        _id:        t._id,
        name:       t.name,
        icon:       t.icon,
        season:     t.season,
        status:     t.status,
        startDate:  t.startDate,
        isWinner:   t.winnerId?.toString() === req.user._id.toString(),
        eliminated: me?.eliminated ?? false,
        wins:       me?.wins       ?? 0,
        losses:     me?.losses     ?? 0,
        finalRound: me?.currentRound ?? 1,
      };
    });

    res.json({ history });
  } catch (err) { next(err); }
};

/* POST /api/tournaments  (admin only)
   Create a new tournament.                                      */
const createTournament = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const {
      name, description, season, bannerColor, icon,
      registrationOpensAt, registrationClosesAt, startDate,
      maxParticipants, rewards, matchDurationMs, questionsPerMatch,
    } = req.body;

    const tournament = await Tournament.create({
      name, description, season, bannerColor, icon,
      registrationOpensAt: new Date(registrationOpensAt),
      registrationClosesAt: new Date(registrationClosesAt),
      startDate:            new Date(startDate),
      maxParticipants:      maxParticipants || 64,
      rewards:              rewards         || DEFAULT_REWARDS,
      matchDurationMs:      matchDurationMs || 90_000,
      questionsPerMatch:    questionsPerMatch || 8,
      status: 'upcoming',
    });

    res.status(201).json({ tournament });
  } catch (err) { next(err); }
};

/* Default reward tiers used when creating tournaments */
const DEFAULT_REWARDS = [
  { place: '1st',   xpBonus: 2000, badgeName: 'Global Cyber Champion', badgeIcon: '👑', title: 'Global Cyber Champion', frameColor: '#ffd700' },
  { place: '2nd',   xpBonus: 1000, badgeName: 'Silver Shield',         badgeIcon: '🥈', title: 'Elite Defender',         frameColor: '#c0c0c0' },
  { place: 'Top 4', xpBonus: 500,  badgeName: 'Semi-Finalist',         badgeIcon: '🥉' },
  { place: 'Top 8', xpBonus: 200,  badgeName: 'Quarter-Finalist',      badgeIcon: '🏅' },
  { place: 'Participant', xpBonus: 50, badgeName: 'Tournament Veteran', badgeIcon: '⚔️' },
];

/* GET /api/tournaments/:id/my-matches
   All matches for the current user in a specific tournament.   */
const getMyMatches = async (req, res, next) => {
  try {
    const matches = await TournamentMatch.find({
      tournamentId: req.params.id,
      $or: [
        { 'player1.userId': req.user._id },
        { 'player2.userId': req.user._id },
      ],
    }).sort({ roundNumber: 1 }).lean();

    res.json({ matches });
  } catch (err) { next(err); }
};

module.exports = {
  getActiveTournaments,
  getAllTournaments,
  getTournament,
  joinTournament,
  leaveTournament,
  generateBracketEndpoint,
  getBracket,
  completeMatch,
  getGlobalRankings,
  getMyTournamentHistory,
  createTournament,
  getMyMatches,
  // Exported for use by socket layer
  advanceWinner,
  completeTournament,
  roundXP,
};
