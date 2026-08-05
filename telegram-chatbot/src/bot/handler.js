const { Telegraf, Markup } = require('telegraf');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { query, clearHistory } = require('../ai');

const OWNER_ID = parseInt(process.env.OWNER_TELEGRAM_ID, 10);

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Ensure owner exists in DB
  async function ensureOwner() {
    try {
      let owner = await User.findOne({ telegramId: OWNER_ID });
      if (!owner) {
        owner = new User({
          telegramId: OWNER_ID,
          isApproved: true,
          isOwner: true,
          requestStatus: 'approved',
        });
        await owner.save();
      } else {
        owner.isOwner = true;
        owner.isApproved = true;
        owner.requestStatus = 'approved';
        await owner.save();
      }
    } catch (e) {
      console.error('ensureOwner error:', e.message);
    }
  }

  // Ensure settings exist
  async function ensureSettings() {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings();
        await settings.save();
      }
      return settings;
    } catch (e) {
      console.error('ensureSettings error:', e.message);
      return new Settings();
    }
  }

  // Get or create user
  async function getOrCreateUser(ctx) {
    const telegramId = ctx.from.id;
    try {
      let user = await User.findOne({ telegramId });
      if (!user) {
        user = new User({
          telegramId,
          username: ctx.from.username || '',
          firstName: ctx.from.first_name || '',
          lastName: ctx.from.last_name || '',
        });
        await user.save();
      }
      return user;
    } catch (e) {
      console.error('getOrCreateUser error:', e.message);
      return { telegramId, isApproved: true, isOwner: true, selectedModel: 'gemini', requestStatus: 'approved' };
    }
  }

  // Check if user is approved
  async function isApproved(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      return user && user.isApproved;
    } catch (e) {
      console.error('isApproved error:', e.message);
      return false;
    }
  }

  // Start command
  bot.start(async (ctx) => {
    await ensureOwner();
    const settings = await ensureSettings();
    const user = await getOrCreateUser(ctx);

    if (user.isOwner) {
      return ctx.reply(
        'Welcome, Owner! You have full access to the bot.\n\n' +
          'Commands:\n' +
          '/dashboard - Open admin dashboard\n' +
          '/requests - View pending requests\n' +
          '/model - Choose AI model\n' +
          '/clear - Clear conversation history\n' +
          '/settings - View current settings',
        Markup.keyboard([
          ['📊 Dashboard', '📋 Pending Requests'],
          ['🤖 Choose Model', '🗑 Clear History'],
        ]).resize()
      );
    }

    if (user.isApproved) {
      return ctx.reply(
        'Welcome back! You are approved. Start chatting with me!\n\n' +
          'Commands:\n' +
          '/model - Choose AI model\n' +
          '/clear - Clear conversation history\n' +
          '/help - Show help',
        Markup.keyboard([
          ['🤖 Choose Model', '🗑 Clear History'],
          ['❓ Help'],
        ]).resize()
      );
    }

    if (user.requestStatus === 'pending') {
      return ctx.reply(
        '⏳ Your access request is pending approval. Please wait for the owner to approve.'
      );
    }

    if (user.requestStatus === 'rejected') {
      return ctx.reply(
        '❌ Your access request was rejected. Contact the owner for more info.\n\nSend /request to try again.',
        Markup.inlineKeyboard([
          Markup.button.callback('📩 Request Access', 'request_access'),
        ])
      );
    }

    // New user - show request button
    return ctx.reply(
      settings.welcomeMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback('📩 Request Access', 'request_access')],
      ])
    );
  });

  // Handle /request command
  bot.command('request', async (ctx) => {
    const user = await getOrCreateUser(ctx);

    if (user.isApproved) {
      return ctx.reply('✅ You are already approved! Start chatting.');
    }

    if (user.requestStatus === 'pending') {
      return ctx.reply('⏳ Your request is already pending approval.');
    }

    user.requestStatus = 'pending';
    try {
      await user.save();
    } catch (e) {
      console.error('Request save error:', e.message);
      return ctx.reply('❌ Could not submit your request. Please try again.');
    }

    // Notify owner
    const ownerMsg = await bot.telegram.sendMessage(
      OWNER_ID,
      `📩 *New Access Request*\n\n` +
        `*User:* ${user.firstName} ${user.lastName}\n` +
        `*Username:* @${user.username || 'N/A'}\n` +
        `*Telegram ID:* \`${user.telegramId}\`\n` +
        `*Date:* ${new Date().toLocaleString()}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Approve', `approve_${user.telegramId}`),
            Markup.button.callback('❌ Reject', `reject_${user.telegramId}`),
          ],
        ]),
      }
    );

    return ctx.reply(
      '✅ Your access request has been sent to the owner. Please wait for approval.'
    );
  });

  // Handle /model command
  bot.command('model', async (ctx) => {
    const user = await getOrCreateUser(ctx);

    if (!user.isApproved) {
      return ctx.reply('❌ You need to be approved first. Use /request to request access.');
    }

    const settings = await Settings.findOne().catch(e => { console.error('Settings lookup error:', e.message); return null; });

    const currentModel = user.selectedModel === 'default'
      ? (settings?.defaultModel || 'gemini')
      : user.selectedModel;

    const modelDisplayNames = {
      gemini: '🌐 Gemini 2.0 Flash (Google)',
      openrouter: '🔗 OpenRouter (Gemini 2.0)',
      nvidia: '🚀 DeepSeek V4 Pro (Nvidia NIM)',
      'nvidia-flash': '⚡ DeepSeek V4 Flash (Nvidia NIM)',
    };

    const currentModelLabel = modelDisplayNames[currentModel] || currentModel;

    const buttons = [];
    if (settings?.enabledModels?.gemini !== false) {
      buttons.push([Markup.button.callback('🌐 Gemini', 'choose_provider_gemini')]);
    }
    if (settings?.enabledModels?.openrouter !== false) {
      buttons.push([Markup.button.callback('🔗 OpenRouter', 'choose_provider_openrouter')]);
    }
    if (settings?.enabledModels?.nvidia !== false) {
      buttons.push([Markup.button.callback('🚀 Nvidia NIM', 'choose_provider_nvidia')]);
    }

    if (buttons.length === 0) {
      return ctx.reply('⚠️ No AI models are currently available. Please contact the owner.');
    }

    return ctx.reply(
      `🤖 *Choose AI Provider*\n\nCurrent: *${currentModelLabel}*\n\nSelect a provider to see available models:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  // Handle provider selection — show model variants
  bot.action('choose_provider_gemini', async (ctx) => {
    await ctx.answerCbQuery();
    const buttons = [
      [Markup.button.callback('🌐 Gemini 2.0 Flash', 'model_gemini')],
      [Markup.button.callback('🔙 Back', 'show_providers')],
    ];
    return ctx.editMessageText(
      `🌐 *Gemini (Google)*\n\nAvailable models:\n• Gemini 2.0 Flash\n\nSelect a model:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  bot.action('choose_provider_openrouter', async (ctx) => {
    await ctx.answerCbQuery();
    const buttons = [
      [Markup.button.callback('🔗 OpenRouter (Gemini 2.0)', 'model_openrouter')],
      [Markup.button.callback('🔙 Back', 'show_providers')],
    ];
    return ctx.editMessageText(
      `🔗 *OpenRouter*\n\nAvailable models:\n• Gemini 2.0 Flash (001)\n\nSelect a model:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  bot.action('choose_provider_nvidia', async (ctx) => {
    await ctx.answerCbQuery();
    const buttons = [
      [Markup.button.callback('🚀 DeepSeek V4 Pro', 'model_nvidia')],
      [Markup.button.callback('⚡ DeepSeek V4 Flash', 'model_nvidia-flash')],
      [Markup.button.callback('🔙 Back', 'show_providers')],
    ];
    return ctx.editMessageText(
      `🚀 *Nvidia NIM*\n\nAvailable models:\n• DeepSeek V4 Pro (no thinking)\n• DeepSeek V4 Flash (with reasoning)\n\nSelect a model:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  bot.action('show_providers', async (ctx) => {
    await ctx.answerCbQuery();
    const settings = await Settings.findOne().catch(() => null);
    const user = await getOrCreateUser(ctx);

    const currentModel = user.selectedModel === 'default'
      ? (settings?.defaultModel || 'gemini')
      : user.selectedModel;

    const modelDisplayNames = {
      gemini: '🌐 Gemini 2.0 Flash (Google)',
      openrouter: '🔗 OpenRouter (Gemini 2.0)',
      nvidia: '🚀 DeepSeek V4 Pro (Nvidia NIM)',
      'nvidia-flash': '⚡ DeepSeek V4 Flash (Nvidia NIM)',
    };

    const currentModelLabel = modelDisplayNames[currentModel] || currentModel;

    const buttons = [];
    if (settings?.enabledModels?.gemini !== false) {
      buttons.push([Markup.button.callback('🌐 Gemini', 'choose_provider_gemini')]);
    }
    if (settings?.enabledModels?.openrouter !== false) {
      buttons.push([Markup.button.callback('🔗 OpenRouter', 'choose_provider_openrouter')]);
    }
    if (settings?.enabledModels?.nvidia !== false) {
      buttons.push([Markup.button.callback('🚀 Nvidia NIM', 'choose_provider_nvidia')]);
    }

    return ctx.editMessageText(
      `🤖 *Choose AI Provider*\n\nCurrent: *${currentModelLabel}*\n\nSelect a provider to see available models:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  // Handle /clear command
  bot.command('clear', async (ctx) => {
    const user = await getOrCreateUser(ctx);

    if (!user.isApproved) {
      return ctx.reply('❌ You need to be approved first.');
    }

    try {
      await clearHistory(user.telegramId);
      return ctx.reply('🗑 Conversation history cleared!');
    } catch (e) {
      console.error('Clear history error:', e.message);
      return ctx.reply('⚠️ Could not clear history. Please try again.');
    }
  });

  // Handle /help command
  bot.command('help', async (ctx) => {
    const user = await getOrCreateUser(ctx);

    if (!user.isApproved) {
      return ctx.reply(
        '🤖 *AI Chatbot Help*\n\n' +
          '1. Request access using /request\n' +
          '2. Wait for owner approval\n' +
          '3. Start chatting with AI!\n\n' +
          'Commands:\n' +
          '/start - Start the bot\n' +
          '/request - Request access\n' +
          '/help - Show this help',
        { parse_mode: 'Markdown' }
      );
    }

    return ctx.reply(
      '🤖 *AI Chatbot Help*\n\n' +
        'Just send me a message and I\'ll respond using AI!\n\n' +
        'Commands:\n' +
        '/model - Choose AI model\n' +
        '/clear - Clear conversation history\n' +
        '/help - Show this help',
      { parse_mode: 'Markdown' }
    );
  });

  // Handle /requests command (owner only)
  bot.command('requests', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;

    const pendingUsers = await User.find({ requestStatus: 'pending' });

    if (pendingUsers.length === 0) {
      return ctx.reply('📋 No pending requests.');
    }

    let msg = `📋 *Pending Requests (${pendingUsers.length})*\n\n`;
    for (const u of pendingUsers) {
      msg += `• ${u.firstName} ${u.lastName} (@${u.username || 'N/A'})\n`;
      msg += `  ID: \`${u.telegramId}\`\n\n`;
    }

    return ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // Handle /settings command (owner only)
  bot.command('settings', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;

    const settings = await Settings.findOne();
    return ctx.reply(
      '⚙️ *Current Settings*\n\n' +
        `Default Model: *${settings.defaultModel}*\n` +
        `Gemini: ${settings.enabledModels.gemini ? '✅' : '❌'}\n` +
        `OpenRouter: ${settings.enabledModels.openrouter ? '✅' : '❌'}\n` +
        `Nvidia NIM: ${settings.enabledModels.nvidia ? '✅' : '❌'}\n` +
        `Max History: *${settings.maxConversationHistory}* messages\n\n` +
        `Dashboard: ${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle callback queries (button clicks)
  bot.action('request_access', async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getOrCreateUser(ctx);

    if (user.isApproved) {
      return ctx.reply('✅ You are already approved!');
    }

     if (user.requestStatus === 'pending') {
      return ctx.reply('⏳ Your request is already pending.');
    }

    user.requestStatus = 'pending';
    try {
      await user.save();
    } catch (e) {
      console.error('Request access save error:', e.message);
      return ctx.reply('❌ Could not submit your request. Please try again.');
    }

    // Notify owner
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `📩 *New Access Request*\n\n` +
        `*User:* ${user.firstName} ${user.lastName}\n` +
        `*Username:* @${user.username || 'N/A'}\n` +
        `*Telegram ID:* \`${user.telegramId}\`\n` +
        `*Date:* ${new Date().toLocaleString()}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Approve', `approve_${user.telegramId}`),
            Markup.button.callback('❌ Reject', `reject_${user.telegramId}`),
          ],
        ]),
      }
    );

    return ctx.reply('✅ Request sent! Please wait for owner approval.');
  });

  // Handle approve/reject actions
  bot.action(/approve_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== OWNER_ID) {
      return ctx.reply('❌ Only the owner can approve requests.');
    }

    const userId = parseInt(ctx.match[1], 10);
    let user;
    try {
      user = await User.findOne({ telegramId: userId });
    } catch (e) {
      console.error('User lookup error:', e.message);
      return ctx.reply('❌ Could not find user. Please try again.');
    }

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    user.isApproved = true;
    user.requestStatus = 'approved';
    try {
      await user.save();
    } catch (e) {
      console.error('User save error:', e.message);
      return ctx.reply(`❌ Could not update user: ${e.message}`);
    }

    // Notify the approved user
    let settings;
    try {
      settings = await Settings.findOne();
    } catch (e) {
      console.error('Settings lookup error:', e.message);
    }

    try {
      await ctx.telegram.sendMessage(
        userId,
        settings?.approvedMessage || '✅ Your access request has been approved! You can now chat with me. Use /model to choose an AI model.'
      );
    } catch (e) {
      console.error('Could not notify user:', e.message);
    }

    // Update the owner's message
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    return ctx.reply(`✅ User ${user.firstName} (ID: ${userId}) has been approved.`);
  });

  bot.action(/reject_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== OWNER_ID) {
      return ctx.reply('❌ Only owner can reject requests.');
    }

    const userId = parseInt(ctx.match[1], 10);
    let user;
    try {
      user = await User.findOne({ telegramId: userId });
    } catch (e) {
      console.error('User lookup error:', e.message);
      return ctx.reply('❌ Could not find user. Please try again.');
    }

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    user.isApproved = false;
    user.requestStatus = 'rejected';
    try {
      await user.save();
    } catch (e) {
      console.error('User save error:', e.message);
      return ctx.reply(`❌ Could not update user: ${e.message}`);
    }

    // Notify the user
    const settings = await ensureSettings();
    try {
      await ctx.telegram.sendMessage(
        userId,
        settings?.rejectedMessage || '❌ Your access request has been rejected. Contact the owner for more info.'
      );
    } catch (e) {
      console.error('Could not notify user:', e.message);
    }

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    return ctx.reply(`❌ User ${user.firstName} (ID: ${userId}) has been rejected.`);
  });

  // Handle model selection
  bot.action(/model_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getOrCreateUser(ctx);

    if (!user.isApproved) {
      return ctx.reply('❌ You need to be approved first.');
    }

    const model = ctx.match[1];
    let settings;
    try {
      settings = await Settings.findOne();
    } catch (e) {
      console.error('Settings lookup error:', e.message);
    }

    if (settings && settings.enabledModels && !settings.enabledModels[model]) {
      return ctx.reply(`⚠️ The ${model} model is currently disabled by the admin.`);
    }

    user.selectedModel = model;
    try {
      await user.save();
    } catch (e) {
      console.error('User model save error:', e.message);
      return ctx.reply('⚠️ Could not save your model preference. Please try again.');
    }

    const modelNames = {
      gemini: '🌐 Gemini 2.0 Flash (Google)',
      openrouter: '🔗 OpenRouter (Gemini 2.0)',
      nvidia: '🚀 DeepSeek V4 Pro (Nvidia NIM)',
      'nvidia-flash': '⚡ DeepSeek V4 Flash (Nvidia NIM)',
    };

    return ctx.reply(`✅ Model changed to *${modelNames[model] || model}*`, {
      parse_mode: 'Markdown',
    });
  });

  // Handle text messages (AI chat)
  bot.on('text', async (ctx) => {
    // Ignore commands
    if (ctx.message.text.startsWith('/')) return;

    const user = await getOrCreateUser(ctx);

    if (!user.isApproved) {
      if (user.requestStatus === 'none') {
        return ctx.reply(
          '❌ You need to request access first.\nUse /request or click the button below:',
          Markup.inlineKeyboard([
            [Markup.button.callback('📩 Request Access', 'request_access')],
          ])
        );
      }
      if (user.requestStatus === 'pending') {
        return ctx.reply('⏳ Your request is pending approval. Please wait.');
      }
      if (user.requestStatus === 'rejected') {
        return ctx.reply(
          '❌ Your request was rejected. Use /request to try again.',
          Markup.inlineKeyboard([
            [Markup.button.callback('📩 Request Access', 'request_access')],
          ])
        );
      }
    }

    // Show typing indicator
    await ctx.sendChatAction('typing');

    const prompt = ctx.message.text;
    const modelPreference = user.selectedModel || 'default';

    try {
      const response = await query(prompt, user.telegramId, modelPreference);

      // Split long messages
      if (response.length > 4000) {
        const chunks = response.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } else {
        await ctx.reply(response, {
          reply_to_message_id: ctx.message.message_id,
        });
      }
    } catch (error) {
      console.error('Chat error:', error.message);
      await ctx.reply('Sorry, an error occurred. Please try again.');
    }
  });

  // Initialize
  ensureOwner();
  ensureSettings();

  return bot;
}

module.exports = { createBot };