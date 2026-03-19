const BattleRoom = require('../models/BattleRoom');

/* ── GET /api/battle/history  ─────────────────────────────────
   Last 20 completed matches for the authenticated user.          */
const getBattleHistory = async (req, res, next) => {
  try {
    const rooms = await BattleRoom.find({
      'players.userId': req.user._id,
      completed: true,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Annotate each room with this user's personal result
    const history = rooms.map(room => {
      const me  = room.players.find(p => p.userId?.toString() === req.user._id.toString());
      const opp = room.players.find(p => p.userId?.toString() !== req.user._id.toString());
      return {
        _id:            room._id,
        roomId:         room.roomId,
        mode:           room.mode,
        outcome:        me?.outcome ?? 'loss',
        myScore:        me?.score   ?? 0,
        oppScore:       opp?.score  ?? 0,
        oppUsername:    opp?.username ?? (opp?.isAI ? 'CyberBot 🤖' : 'Unknown'),
        accuracy:       me?.accuracy    ?? 0,
        avgResponseMs:  me?.avgResponseMs ?? 0,
        xpEarned:       me?.xpEarned    ?? 0,
        totalQuestions: room.totalQuestions,
        duration:       room.duration,
        playedAt:       room.createdAt,
        winnerUsername: room.winnerUsername,
      };
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
};

/* ── GET /api/battle/stats  ───────────────────────────────────
   Aggregated W/L/D stats + total XP earned from battles.        */
const getBattleStats = async (req, res, next) => {
  try {
    const rooms = await BattleRoom.find({
      'players.userId': req.user._id,
      completed: true,
    }).lean();

    let wins = 0, losses = 0, draws = 0, totalXP = 0, totalScore = 0;
    let totalAnswered = 0, totalCorrect = 0;

    for (const room of rooms) {
      const me = room.players.find(p => p.userId?.toString() === req.user._id.toString());
      if (!me) continue;

      totalXP      += me.xpEarned      ?? 0;
      totalScore   += me.score         ?? 0;
      totalAnswered+= me.totalAnswered ?? 0;
      totalCorrect += me.correctCount  ?? 0;

      if (me.outcome === 'win')  wins++;
      else if (me.outcome === 'loss') losses++;
      else draws++;
    }

    const winRate     = wins + losses + draws > 0
      ? Math.round((wins / (wins + losses + draws)) * 100) : 0;
    const accuracy    = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    res.json({
      wins, losses, draws,
      totalBattles: rooms.length,
      winRate,
      accuracy,
      totalXP,
      totalScore,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBattleHistory, getBattleStats };
