const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  enabledModels: {
    gemini: { type: Boolean, default: true },
    openrouter: { type: Boolean, default: true },
    nvidia: { type: Boolean, default: true },
    'nvidia-flash': { type: Boolean, default: true },
  },
  defaultModel: {
    type: String,
    enum: ['gemini', 'openrouter', 'nvidia', 'nvidia-flash'],
    default: 'gemini',
  },
  maxConversationHistory: {
    type: Number,
    default: 20,
  },
  welcomeMessage: {
    type: String,
    default: 'Welcome! I am your AI assistant. Please request access to start chatting.',
  },
  approvedMessage: {
    type: String,
    default: 'Your request has been approved! You can now chat with me. Use /model to choose an AI model.',
  },
  rejectedMessage: {
    type: String,
    default: 'Your request has been rejected. Please contact the owner for more information.',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

settingsSchema.pre('save', async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Settings', settingsSchema);