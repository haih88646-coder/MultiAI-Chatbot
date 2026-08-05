require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { createBot } = require('./bot/handler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: true,
  credentials: true,
}));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'telegram-chatbot-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Use MongoDB session store in production for persistence
if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://localhost:27017/telegram-chatbot') {
  try {
    const MongoStore = require('connect-mongo');
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60,
    });
    console.log('✅ MongoDB session store configured');
  } catch (e) {
    console.log('⚠️ MongoDB session store unavailable, using memory store');
  }
}

app.use(session(sessionConfig));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api', apiRoutes);

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Telegram AI Chatbot',
    version: '1.0.0',
    endpoints: {
      dashboard: '/dashboard',
      api: '/api',
      health: '/health',
    },
  });
});

// MongoDB Connection
async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Bot will run without database — users will not be able to request access.');
    console.log('⚠️ Running without database - some features may not work');
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️ Running without database - some features may not work');
    return false;
  }
}

// Track if MongoDB is connected
let dbConnected = false;

// Initialize Telegram Bot
let bot = null;

async function initBot() {
  if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'your_telegram_bot_token_here') {
    console.log('⚠️ BOT_TOKEN not configured. Bot will not start.');
    return;
  }

  if (!dbConnected) {
    console.log('⚠️ BOT_TOKEN is set but MongoDB is not connected. Bot will start but users cannot request access.');
  }

  try {
    bot = createBot();

    if (process.env.NODE_ENV === 'production' || (process.env.APP_URL && !process.env.APP_URL.includes('your-app'))) {
      // Webhook mode for production (Vercel/Render)
      const webhookUrl = `${process.env.APP_URL}/api/telegram-webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);

      app.post('/api/telegram-webhook', (req, res) => {
        bot.handleUpdate(req.body);
        res.sendStatus(200);
      });
    } else {
      // Long polling for development
      bot.launch();
      console.log('✅ Telegram bot started (long polling)');
    }

    console.log('✅ Bot initialized successfully');
  } catch (error) {
    console.error('❌ Bot initialization error:', error.message);
  }
}

// Start server
async function start() {
  dbConnected = await connectDB();
  await initBot();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.once('SIGINT', () => {
  if (bot) bot.stop('SIGINT');
  mongoose.connection.close();
  process.exit(0);
});

process.once('SIGTERM', () => {
  if (bot) bot.stop('SIGTERM');
  mongoose.connection.close();
  process.exit(0);
});

start();

module.exports = app;