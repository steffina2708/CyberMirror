const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: existingUser.email === email ? 'Email already registered' : 'Username already taken' });
    }

    const user = await User.create({ username, email, password });
    res.status(201).json({
      token: generateToken(user._id),
      user: { _id: user._id, username: user.username, email: user.email, level: user.level, totalScore: user.totalScore, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id, username: user.username, email: user.email,
        level: user.level, totalScore: user.totalScore, scenariosCompleted: user.scenariosCompleted,
        totalAttempts: user.totalAttempts, accuracyPercentage: user.accuracyPercentage,
        avatar: user.avatar,
        totalXP: user.totalXP || 0,
        gamesCompleted: user.gamesCompleted || 0,
        labsCompleted: user.labsCompleted || 0,
        earnedBadges: user.earnedBadges || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

const updateProfile = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({
      user: {
        _id: user._id, username: user.username, email: user.email,
        level: user.level, totalScore: user.totalScore,
        totalAttempts: user.totalAttempts, accuracyPercentage: user.accuracyPercentage,
        scenariosCompleted: user.scenariosCompleted, avatar: user.avatar,
        totalXP: user.totalXP || 0,
        gamesCompleted: user.gamesCompleted || 0,
        labsCompleted: user.labsCompleted || 0,
        earnedBadges: user.earnedBadges || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
};

module.exports = { register, login, getProfile, updateProfile };
