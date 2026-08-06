# Deployment Guide — Telegram AI Chatbot

A step-by-step guide for deploying the Telegram AI Chatbot with multi-model support (Gemini, OpenRouter, NVIDIA NIM), a MongoDB-backed admin dashboard, and Telegram webhook integration.

> **Repo structure:** The project lives in the `telegram-chatbot/` subdirectory of the repository root. A `render.yaml` at the **repo root** uses `rootDir: telegram-chatbot` to tell Render where the Node.js app is located.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Choose a Deployment Platform](#choose-a-deployment-platform)
   - [Option A: Render (Recommended — 1-Click)](#option-a-render-recommended--1-click)
   - [Option B: Vercel](#option-b-vercel)
   - [Option C: Docker / Self-Hosted VPS](#option-c-docker--self-hosted-vps)
   - [Option D: Railway](#option-d-railway)
4. [Post-Deployment Checklist](#post-deployment-checklist)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, gather the following:

| Item | Where to Get It |
|---|---|
| **Telegram Bot Token** | Create a bot via [@BotFather](https://t.me/BotFather) on Telegram. |
| **Owner Telegram ID** | Send `/start` to your bot, then visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` to find your `id`. |
| **MongoDB Connection String** | [MongoDB Atlas](https://cloud.mongodb.com) (recommended) or any MongoDB instance. |
| **Gemini API Key** | [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenRouter API Key** | [OpenRouter](https://openrouter.ai/keys) |
| **NVIDIA NIM API Key** | [NVIDIA NIM](https://console.nvidia.com/en-us/nim/) |

> **Note:** You don't need all three AI API keys. At least one is required. The app gracefully degrades if some are missing — users simply won't be able to select disabled models.

---

## Environment Variables

All deployment platforms require the following environment variables. None are hardcoded; all come from `.env` / platform env vars.

### Required

| Variable | Description | Example |
|---|---|---|
| `BOT_TOKEN` | Telegram bot token from BotFather | `123456789:ABC...` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster0...` |
| `OWNER_TELEGRAM_ID` | Your personal Telegram numeric ID | `123456789` |
| `JWT_SECRET` | Secret for signing JWT tokens | (strong random string) |
| `SESSION_SECRET` | Secret for Express sessions | (strong random string) |
| `ADMIN_USERNAME` | Dashboard login username | `admin` |
| `ADMIN_PASSWORD` | Dashboard login password | (strong password) |
| `APP_URL` | Public URL of your deployed app (HTTPS) | `https://mybot.onrender.com` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | (empty — model unavailable) |
| `OPENROUTER_API_KEY` | OpenRouter API key | (empty — model unavailable) |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM API key | (empty — model unavailable) |
| `DEFAULT_AI_MODEL` | Default AI model if DB settings unset | `openrouter` |
| `NODE_ENV` | Environment mode | `production` (set automatically) |
| `PORT` | Server port | `3000` (platform-provided) |

---

## Choose a Deployment Platform

---

### Option A: Render (Recommended — 1-Click)

Render is the simplest deployment option. The project includes a pre-configured `render.yaml` at the **repository root** with `rootDir: telegram-chatbot` pointing to the Node.js app in the subdirectory.

#### Steps

1. **Push your code to a Git repository**

   If you haven't already:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-git-repository-url>
   git push -u origin main
   ```

2. **Create a web service on Render**

   - Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in.
    - Click **New** → **Web Service**.
    - Connect your Git repository.
    - Select the branch (e.g., `main`).
    - **Root Directory:** `telegram-chatbot` (important — the app is in this subdirectory)
    - **Build Command:** `npm install`
    - **Start Command:** `npm start`
    - Set the **Environment** to `Node`.

3. **Add environment variables**

   In the Render dashboard, go to your service → **Environment** → **Environment Variables** and add all the variables from the [Environment Variables](#environment-variables) section above.

   Alternatively, the included `render.yaml` already declares all variables with `sync: false` (meaning you must add their values manually in the Render dashboard). Render will auto-detect `render.yaml` in the repo root if you use the "Blueprint" approach.

4. **Deploy**

   - Click **Create Web Service** (or **Create Resource** if using Blueprints).
   - Render will build and deploy automatically. Monitor the **Deploys** tab for build logs.

5. **Verify**

   - Once deployed, visit `https://<your-service>.onrender.com/health` — you should see `{"status":"ok","timestamp":"..."}`.
   - Visit `https://<your-service>.onrender.com/dashboard` to access the admin dashboard (login with your `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

#### Key Files Used

- `render.yaml` — Declares service type, build/start commands, and env var placeholders.
- `src/index.js` — In production mode (`NODE_ENV=production`), the bot uses **webhooks** (not long polling), which is required for serverless/container platforms.

---

### Option B: Vercel

Vercel supports Node.js serverless functions. The project includes a `vercel.json` for routing configuration.

> **Warning:** Vercel free tier has a 10-second execution timeout for serverless functions. The bot webhook endpoint must respond quickly with a `200 OK` (which this app does), but database operations may occasionally time out under load. For a production bot, Render or Docker is preferred.

#### Steps

1. **Install Vercel CLI (optional but recommended)**

   ```bash
   npm i -g vercel
   ```

2. **Link or create a new project**

   ```bash
   vercel
   ```

   Or use the Vercel dashboard: Import your Git repo.

3. **Add environment variables**

   In the Vercel dashboard → your project → **Settings** → **Environment Variables**, add all variables from the [Environment Variables](#environment-variables) section.

4. **Deploy**

   ```bash
   vercel --prod
   ```

   Or push to your Git repository — Vercel auto-deploys on push.

5. **Verify**

   - Visit `https://<your-project>.vercel.app/health`.
   - Open `https://<your-project>.vercel.app/dashboard` to access the admin panel.

#### Limitations

- **Webhook URL:** The Telegram webhook is set to `${APP_URL}/api/telegram-webhook`. Make sure `APP_URL` matches your Vercel deployment URL.
- **Cold starts:** Serverless functions may have cold-start latency, but this does not affect Telegram webhook handling since Telegram retries on timeout.
- **MongoDB connections:** Each serverless invocation opens a new DB connection. The app uses `mongoose.connect` on every start; for high traffic you may want connection pooling. For typical bot usage this is fine.

#### Key Files Used

- `vercel.json` — Routes `/api/*`, `/dashboard`, `/login`, `/health` to `src/index.js`; serves static files from `public/`.

---

### Option C: Docker / Self-Hosted VPS

Run the application on your own server (e.g., DigitalOcean, AWS EC2, Linode, or a local machine).

#### Prerequisites on the Server

- Node.js 18+ and npm
- Docker and Docker Compose (if using Docker)
- Port 3000 open (or whatever `PORT` you set)

#### Option C1: Using Docker

1. **Create a Dockerfile** (not included in repo — create this in the project root):

   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .

   EXPOSE 3000

   CMD ["node", "src/index.js"]
   ```

2. **Create a `docker-compose.yml`** (in the project root):

   ```yaml
   version: "3.8"

   services:
     app:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env
       depends_on:
         - mongodb
       restart: unless-stopped

     mongodb:
       image: mongo:7
       restart: unless-stopped
       volumes:
         - mongodb_data:/data/db
       ports:
         - "27017:27017"

   volumes:
     mongodb_data:
   ```

3. **Create a `.env` file** in the project root:

   ```bash
   BOT_TOKEN=your_telegram_bot_token_here
   MONGODB_URI=mongodb://mongodb:27017/telegram-chatbot
   OWNER_TELEGRAM_ID=your_telegram_id
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_admin_password
   APP_URL=https://your-domain.com
   GEMINI_API_KEY=your_gemini_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   NVIDIA_NIM_API_KEY=your_nvidia_api_key
    DEFAULT_AI_MODEL=openrouter
   NODE_ENV=production
   ```

   > **Note:** When using Docker Compose with a local MongoDB container, use `mongodb://mongodb:27017/telegram-chatbot` as the `MONGODB_URI` (the service name `mongodb` resolves within the Docker network).

4. **Build and start**

   ```bash
   docker-compose up -d --build
   ```

5. **Verify**

   - `curl http://localhost:3000/health` → `{"status":"ok",...}`
   - Visit `http://localhost:3000/dashboard` to access the admin panel.

6. **(Optional) Set up a reverse proxy with Nginx + HTTPS**

   For production, use Nginx as a reverse proxy with Let's Encrypt SSL:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Install Certbot for free SSL certificates:

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

#### Option C2: Direct Deployment (No Docker)

1. **Clone and install**

   ```bash
   git clone <your-repo>
   cd telegram-chatbot
   npm install
   ```

2. **Create `.env`**

   ```bash
   BOT_TOKEN=your_telegram_bot_token_here
   MONGODB_URI=mongodb://localhost:27017/telegram-chatbot
   OWNER_TELEGRAM_ID=your_telegram_id
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_admin_password
   APP_URL=https://your-domain.com
   GEMINI_API_KEY=your_gemini_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
    NVIDIA_NIM_API_KEY=your_nvidia_api_key
    DEFAULT_AI_MODEL=openrouter
    NODE_ENV=production
    PORT=3000
   ```

3. **Start the app**

   ```bash
   npm start
   ```

   Or use a process manager for production:

   ```bash
   npm install -g pm2
   pm2 start src/index.js --name telegram-chatbot
   pm2 save
   pm2 startup
   ```

---

### Option D: Railway

Railway provides a Heroku-like experience with built-in deployment from Git.

#### Steps

1. **Create a new project** at [Railway](https://railway.app).
2. **Deploy from your repository** by clicking **Deploy from GitHub** and selecting your repo.
3. **Add environment variables** in the Railway dashboard → **Variables**.
4. **Set the Start Command:** `npm start`
5. **Set the Build Command:** `npm install`
6. Railway will auto-deploy on push. Add a health check on `/health`.
7. **Assign a public domain** or use the auto-generated Railway URL for `APP_URL`.

---

## Post-Deployment Checklist

After deploying, complete these steps:

1. **Verify health endpoint**

   ```bash
   curl https://<your-app-url>/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

2. **Test the Telegram webhook**

   After the first deploy, check if the bot webhook is set correctly:

   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```

   The `url` field should show `https://<your-app-url>/api/telegram-webhook` and `has_custom_certificate` should be `false`.

3. **Access the admin dashboard**

   - Visit `https://<your-app-url>/dashboard`
   - Log in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
   - The dashboard lets you view users, approve/reject requests, manage settings, and view conversation history.

4. **Test the bot on Telegram**

   - Start a chat with your bot on Telegram.
   - Send `/start`.
   - If you're the owner (`OWNER_TELEGRAM_ID`), you'll get full access.
   - Other users will need to send `/request` to request access, which you can approve via the dashboard or inline buttons in Telegram.

5. **Configure MongoDB Atlas IP Whitelist (if using Atlas)**

   If using MongoDB Atlas, ensure your database user's IP whitelist allows connections from your deployment platform:

   - **Render:** Add Render's outbound IPs (or use `0.0.0.0/0` for testing).
   - **Vercel:** Add Vercel's IP ranges.
   - **Docker/VPS:** Your server's IP is usually auto-allowed.
   - **Railway:** Use `0.0.0.0/0` or add Railway's IPs.

6. **Set up TLS/SSL (Docker/VPS only)**

   If running directly without a platform that provides HTTPS, use Nginx with Let's Encrypt (see [Option C1](#option-c1-using-docker)). Telegram **requires** HTTPS webhooks.

7. **Configure a custom domain (optional)**

   Most platforms allow you to attach a custom domain. After setting it, update `APP_URL` to match your domain.

---

## Troubleshooting

### Bot doesn't respond to messages

1. Check that `BOT_TOKEN` is valid (test with `curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe`).
2. Check the server logs for webhook errors.
3. Verify the webhook URL via `getWebhookInfo` (see Post-Deployment Checklist step 3).

### MongoDB connection fails

1. Ensure `MONGODB_URI` is correct and the IP is whitelisted (Atlas) or the DB is reachable.
2. The app runs without MongoDB but users won't be able to register. Check logs for `MongoDB connected successfully`.
3. If using Atlas, ensure your database user has read/write privileges and the connection string includes the database name.

### Dashboard login fails

1. Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` match exactly in the environment.
2. Verify `JWT_SECRET` and `SESSION_SECRET` are set and consistent.

### AI model returns errors

1. Ensure the corresponding API key is set (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `NVIDIA_NIM_API_KEY`).
2. Check that the API key has sufficient credits/quota.
3. The app falls back to showing the error message from the API directly. Check server logs for details.

### Vercel serverless timeout / cold start

1. Serverless functions have a 10-second timeout on the free tier. If your DB queries are slow, consider using Render or a VPS.
2. Cold starts add ~1-2 seconds of latency. This is acceptable for webhook-based bots.

### Render build fails with "Could not read package.json"

This happens when the project is in a subdirectory (e.g., `telegram-chatbot/`) but Render looks for `package.json` at the repo root.

1. **Ensure `render.yaml` is at the repo root** (not inside the project subdirectory) and includes `rootDir: telegram-chatbot`.
2. **Or in the Render dashboard**, set **Root Directory** to `telegram-chatbot` when creating the service.

- In development (`NODE_ENV` not set to `production`), the bot uses **long polling** instead of webhooks. So local development works without a public URL.
- To test webhooks locally, use [ngrok](https://ngrok.com): `ngrok http 3000`, then set `APP_URL=https://<your-ngrok-url>`.

### File Upload Support

The bot can extract text from uploaded files and analyze them with any AI model. Supported formats:

| Format | Extension | Method |
|--------|-----------|--------|
| Plain Text | `.txt` | Direct read |
| PDF | `.pdf` | `pdf-parse` |
| Word | `.docx` | `mammoth` |
| Excel | `.xlsx`, `.xls` | `xlsx` |
| PowerPoint | `.pptx` | `jszip` + XML parsing |
| Images | `.jpg`, `.png`, `.gif`, `.webp` | `tesseract.js` OCR |

> **Note:** Image OCR uses `tesseract.js` which adds ~30MB to the deployment. On Render free tier, this may increase build time but should work within memory limits.

**How to use:**
1. Send a file to the bot in Telegram (as document or photo)
2. The bot will extract text and send it to your selected AI model
3. The AI will analyze the file content and respond

### AI Models

| Model Key | Provider | Model Name | Speed | Notes |
|---|---|---|---|---|
| `openrouter` | OpenRouter | GPT-OSS 20B (free) | ~3.5s | Recommended default |
| `cohere` | OpenRouter | Cohere North Mini (free) | ~3.1s | Fast code-focused model |
| `gemma` | OpenRouter | Gemma 4 26B (free) | ~2s | ⚠️ Requires privacy config: visit `openrouter.ai/settings/privacy` and enable "Allow content that may be used in AI training"
| `gemma-large` | OpenRouter | Gemma 4 31B (free) | ~2s | ⚠️ Requires privacy config: visit `openrouter.ai/settings/privacy` and enable "Allow content that may be used in AI training"
| `or-free` | OpenRouter | OpenRouter Free Pool | ~2s | Auto-routes to best free model |
| `nvidia` | NVIDIA NIM | Mistral Nemotron | ~1-5s | Fast general-purpose |
| `llama` | NVIDIA NIM | Llama 3.1 8B | ~7s | Medium speed |
| `inkling` | NVIDIA NIM | ThinkingMachines Inkling | ~4s | Fast reasoning model |
| `deepseek-flash` | NVIDIA NIM | DeepSeek V4 Flash | ~27s | Slow — reasoning model |

> **Tip:** If models seem slow or error out, test your API keys locally with `node test-modules.js` before deploying.

```
Client (Telegram) → Telegram API → Webhook (your deployed app) → AI Provider
                                ↓
Client (Browser) → Dashboard (Express) → MongoDB (Mongoose)
```

- **Express server** (`src/index.js`) serves both the Express API (dashboard/backend) and the Telegram webhook endpoint.
- **Telegraf bot** (`src/bot/handler.js`) handles all Telegram commands and messages.
- **AI providers** (`src/ai/`) route queries to Gemini, OpenRouter, or NVIDIA NIM based on user preference and admin settings.
- **MongoDB** (`src/models/`) stores Users, Conversations, and Settings.
- In **production mode**, the bot uses webhooks (required for server platforms). In **development mode**, it uses long polling.
```
