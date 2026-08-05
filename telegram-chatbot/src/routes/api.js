const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Conversation = require('../models/Conversation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set session
    req.session.isAuthenticated = true;
    req.session.username = username;

    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
router.get('/auth-status', authMiddleware, (req, res) => {
  res.json({ authenticated: true });
});

// Get dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const approvedUsers = await User.countDocuments({ isApproved: true });
    const pendingRequests = await User.countDocuments({ requestStatus: 'pending' });
    const rejectedRequests = await User.countDocuments({ requestStatus: 'rejected' });
    const totalConversations = await Conversation.countDocuments();
    const settings = await Settings.findOne();

    res.json({
      totalUsers,
      approvedUsers,
      pendingRequests,
      rejectedRequests,
      totalConversations,
      settings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status) {
      if (status === 'approved') query.isApproved = true;
      else if (status === 'pending') query.requestStatus = 'pending';
      else if (status === 'rejected') query.requestStatus = 'rejected';
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve user
router.post('/users/:telegramId/approve', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isApproved = true;
    user.requestStatus = 'approved';
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject user
router.post('/users/:telegramId/reject', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isApproved = false;
    user.requestStatus = 'rejected';
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/users/:telegramId', authMiddleware, async (req, res) => {
  try {
    await User.findOneAndDelete({ telegramId: parseInt(req.params.telegramId) });
    await Conversation.findOneAndDelete({ userId: parseInt(req.params.telegramId) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const {
      enabledModels,
      defaultModel,
      maxConversationHistory,
      welcomeMessage,
      approvedMessage,
      rejectedMessage,
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (enabledModels) settings.enabledModels = enabledModels;
    if (defaultModel) settings.defaultModel = defaultModel;
    if (maxConversationHistory) settings.maxConversationHistory = maxConversationHistory;
    if (welcomeMessage) settings.welcomeMessage = welcomeMessage;
    if (approvedMessage) settings.approvedMessage = approvedMessage;
    if (rejectedMessage) settings.rejectedMessage = rejectedMessage;

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation history for a user
router.get('/conversations/:userId', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      userId: parseInt(req.params.userId),
    });
    res.json(conversation || { messages: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear conversation for a user
router.delete('/conversations/:userId', authMiddleware, async (req, res) => {
  try {
    await Conversation.findOneAndUpdate(
      { userId: parseInt(req.params.userId) },
      { messages: [], updatedAt: Date.now() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;