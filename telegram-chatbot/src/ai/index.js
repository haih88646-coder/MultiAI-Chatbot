const { queryGemini } = require('./gemini');
const { queryOpenRouter } = require('./openrouter');
const { queryNvidiaNim, queryNvidiaNimFlash } = require('./nvidia');
const Conversation = require('../models/Conversation');
const Settings = require('../models/Settings');

const MAX_HISTORY = 20;

async function getConversationHistory(userId) {
  let conversation = await Conversation.findOne({ userId });
  if (!conversation) {
    conversation = new Conversation({ userId, messages: [] });
    await conversation.save();
  }
  return conversation;
}

async function saveMessageToHistory(userId, role, content, model = '') {
  let conversation = await Conversation.findOne({ userId });
  if (!conversation) {
    conversation = new Conversation({ userId, messages: [] });
  }

  conversation.messages.push({ role, content, model, timestamp: new Date() });

  // Keep only the last N messages
  const settings = await Settings.findOne();
  const maxHistory = settings ? settings.maxConversationHistory : MAX_HISTORY;
  if (conversation.messages.length > maxHistory) {
    conversation.messages = conversation.messages.slice(-maxHistory);
  }

  await conversation.save();
  return conversation;
}

async function clearHistory(userId) {
  await Conversation.findOneAndUpdate(
    { userId },
    { messages: [], updatedAt: Date.now() },
    { upsert: true }
  );
}

async function query(prompt, userId, modelPreference = 'default') {
  try {
    const settings = await Settings.findOne();
    const conversation = await getConversationHistory(userId);

    // Determine which model to use
    let selectedModel = modelPreference;
    if (selectedModel === 'default') {
      selectedModel = settings?.defaultModel || process.env.DEFAULT_AI_MODEL || 'gemini';
    }

    // Check if model is enabled
    if (settings && settings.enabledModels) {
      if (!settings.enabledModels[selectedModel]) {
        return `The ${selectedModel} model is currently disabled by the admin. Please choose another model using /model command.`;
      }
    }

    // Get recent conversation history (last 10 messages for context)
    const recentHistory = conversation.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let response;

    switch (selectedModel) {
      case 'gemini':
        response = await queryGemini(
          prompt,
          recentHistory,
          process.env.GEMINI_API_KEY
        );
        break;
      case 'openrouter':
        response = await queryOpenRouter(
          prompt,
          recentHistory,
          process.env.OPENROUTER_API_KEY
        );
        break;
      case 'nvidia':
        response = await queryNvidiaNim(
          prompt,
          recentHistory,
          process.env.NVIDIA_NIM_API_KEY
        );
        break;
      case 'nvidia-flash':
        response = await queryNvidiaNimFlash(
          prompt,
          recentHistory,
          process.env.NVIDIA_NIM_API_KEY
        );
        break;
      default:
        response = await queryGemini(
          prompt,
          recentHistory,
          process.env.GEMINI_API_KEY
        );
    }

    // Save to conversation history
    await saveMessageToHistory(userId, 'user', prompt, selectedModel);
    await saveMessageToHistory(userId, 'assistant', response, selectedModel);

    return response;
  } catch (error) {
    console.error('AI Query Error:', error.message);
    return 'Sorry, an error occurred while processing your request. Please try again later.';
  }
}

module.exports = {
  query,
  getConversationHistory,
  saveMessageToHistory,
  clearHistory,
};