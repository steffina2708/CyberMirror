const User = require('../models/User');

// ── Badge catalogue (server-authoritative) ─────────────────────
const BADGE_DEFS = [
  { id: 'first_mission',    name: 'First Mission',    icon: '🚀', desc: 'Completed your first XP-earning activity' },
  { id: 'phishing_hunter',  name: 'Phishing Hunter',  icon: '🎣', desc: 'Completed the Phishing Detective game' },
  { id: 'password_master',  name: 'Password Master',  icon: '🔐', desc: 'Completed the Password Battle game' },
  { id: 'network_defender', name: 'Network Defender', icon: '🌐', desc: 'Completed the Network Defender game' },
  { id: 'soc_analyst',      name: 'SOC Analyst',      icon: '🛡️', desc: 'Completed Cyber Defense Strategy' },
  { id: 'lab_explorer',     name: 'Lab Explorer',     icon: '🧪', desc: 'Completed a Cyber Lab' },
  { id: 'cyber_veteran',    name: 'Cyber Veteran',    icon: '⭐', desc: 'Reached Level 5' },
  { id: 'cyber_champion',   name: 'Cyber Champion',   icon: '🏆', desc: 'Reached Level 10' },
  { id: 'cyber_gamer',      name: 'Cyber Gamer',      icon: '🎮', desc: 'Completed 5 games' },
  { id: 'xp_warrior',       name: 'XP Warrior',       icon: '⚡', desc: 'Earned 500+ total XP' },
];

// ── POST /api/xp/award ─────────────────────────────────────────
const awardXP = async (req, res) => {
  try {
    const { xp = 0, source = 'game', badgeIds = [] } = req.body;
    if (typeof xp !== 'number' || xp < 0 || xp > 500) {
      return res.status(400).json({ message: 'Invalid XP value' });
    }

    const user      = await User.findById(req.user._id);
    const prevXP    = user.totalXP    || 0;
    const prevLevel = user.level      || 1;

    // ── Update XP + level ───────────────────────────────────────
    user.totalXP   = prevXP + xp;
    user.level     = Math.floor(user.totalXP / 100) + 1;

    // ── Update completion counters ──────────────────────────────
    if (source === 'game') user.gamesCompleted = (user.gamesCompleted || 0) + 1;
    if (source === 'lab')  user.labsCompleted  = (user.labsCompleted  || 0) + 1;

    // ── Determine all badges to check ──────────────────────────
    const toCheck = new Set([
      ...badgeIds,
      // XP/level thresholds (always auto-checked)
      ...(user.totalXP >= 20              ? ['first_mission']  : []),
      ...(user.totalXP >= 500             ? ['xp_warrior']     : []),
      ...(user.level   >= 5               ? ['cyber_veteran']  : []),
      ...(user.level   >= 10              ? ['cyber_champion'] : []),
      // Completion-count thresholds
      ...(user.gamesCompleted >= 1        ? ['first_mission']  : []),
      ...(user.gamesCompleted >= 5        ? ['cyber_gamer']    : []),
      ...(user.labsCompleted  >= 1        ? ['lab_explorer']   : []),
    ]);

    // ── Award new badges (skip already-earned) ──────────────────
    const alreadyHave = new Set((user.earnedBadges || []).map(b => b.id));
    const newBadges   = [];

    toCheck.forEach(id => {
      if (alreadyHave.has(id)) return;
      const def = BADGE_DEFS.find(b => b.id === id);
      if (!def) return;
      user.earnedBadges.push({ id: def.id, name: def.name, icon: def.icon, desc: def.desc });
      newBadges.push(def);
    });

    await user.save();

    return res.json({
      xpGained:  xp,
      totalXP:   user.totalXP,
      level:     user.level,
      prevLevel,
      leveledUp: user.level > prevLevel,
      gamesCompleted: user.gamesCompleted,
      labsCompleted:  user.labsCompleted,
      newBadges,
      earnedBadges: user.earnedBadges,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/xp/progress ──────────────────────────────────────
const getProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'totalXP level gamesCompleted labsCompleted earnedBadges scenariosCompleted totalScore'
    );
    res.json({
      totalXP:          user.totalXP          || 0,
      level:            user.level            || 1,
      gamesCompleted:   user.gamesCompleted   || 0,
      labsCompleted:    user.labsCompleted    || 0,
      scenariosCompleted: user.scenariosCompleted || 0,
      totalScore:       user.totalScore       || 0,
      earnedBadges:     user.earnedBadges     || [],
      xpToNextLevel:    100 - ((user.totalXP || 0) % 100),
      currentLevelXP:   (user.totalXP || 0) % 100,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { awardXP, getProgress };
