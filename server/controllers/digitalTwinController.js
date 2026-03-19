const DigitalTwinResult = require('../models/DigitalTwinResult');

/* ── POST /api/digital-twin/save ─────────────────────────────────
   Persist completed simulation results. Called from the frontend
   at the end of every session.
──────────────────────────────────────────────────────────────── */
exports.saveResult = async (req, res) => {
  try {
    const {
      simulationScore,
      threatsHandled,
      correctResponses,
      xpEarned,
      finalThreatLevel,
      duration,
      responses,
    } = req.body;

    const result = await DigitalTwinResult.create({
      userId:           req.user._id,
      simulationScore:  simulationScore  ?? 0,
      threatsHandled:   threatsHandled   ?? 0,
      correctResponses: correctResponses ?? 0,
      xpEarned:         xpEarned         ?? 0,
      finalThreatLevel: finalThreatLevel ?? 0,
      duration:         duration         ?? 60,
      responses:        responses        ?? [],
    });

    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error('[DigitalTwin] saveResult error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/digital-twin/history ──────────────────────────────
   Return the last 10 sessions for the logged-in user.
──────────────────────────────────────────────────────────────── */
exports.getHistory = async (req, res) => {
  try {
    const history = await DigitalTwinResult
      .find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, history });
  } catch (err) {
    console.error('[DigitalTwin] getHistory error:', err);
    res.status(500).json({ message: err.message });
  }
};
