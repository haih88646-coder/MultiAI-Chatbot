require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;

const prompt = 'Hello, what is 2+2?';

const openrouterModels = [
  'openai/gpt-oss-20b:free',
  'cohere/north-mini-code:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash:free',
  'meta-llama/llama-3.2-3b:free',
  'meta-llama/llama-3.3-70b-specdec:free',
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-chat-v:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'teknium/openhermes-llama-3.2-3b:free',
  'microsoft/phi-3.5-mini:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'nvidia/nemotron-4-340b-instruct:free',
  'mistralai/mistral-nemo:free',
  'google/gemma-7b-it:free',
];

const nvidiaModels = [
  'mistralai/mistral-nemotron',
  'z-ai/glm-5.2',
  'nvidia/nemotron-4-340b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.1-nemotron-128b-instruct',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
  'google/gemma-2b-it',
  'google/gemma-7b-it',
];

const geminiModels = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

async function testOpenRouter(model) {
  if (!OPENROUTER_API_KEY) return 'Key not set';
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Test'
      },
      body: JSON.stringify({ model, messages: [{role:'user',content:prompt}], max_tokens: 50 }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = (Date.now() - start) / 1000;
    if (!resp.ok) {
      const data = await resp.text();
      return `❌ ${model} - ${resp.status} - ${data.substring(0, 100)}`;
    }
    const data = await resp.json();
    if (data.choices && data.choices[0]) {
      return `✅ ${model} - ${elapsed.toFixed(1)}s`;
    }
    return `❌ ${model} - no choices`;
  } catch (e) {
    clearTimeout(timeoutId);
    return `❌ ${model} - ${e.name}`;
  }
}

async function testNVIDIA(model) {
  if (!NVIDIA_NIM_API_KEY) return 'Key not set';
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`
      },
      body: JSON.stringify({ model, messages: [{role:'user',content:prompt}], max_tokens: 50 }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = (Date.now() - start) / 1000;
    if (!resp.ok) {
      const data = await resp.text();
      return `❌ ${model} - ${resp.status} - ${data.substring(0, 80)}`;
    }
    const data = await resp.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return `✅ ${model} - ${elapsed.toFixed(1)}s - ${data.choices[0].message.content.substring(0, 50)}`;
    }
    return `❌ ${model} - no message`;
  } catch (e) {
    clearTimeout(timeoutId);
    return `❌ ${model} - ${e.name}`;
  }
}

async function testGemini(model) {
  if (!GEMINI_API_KEY) return 'Key not set';
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 50 }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    const elapsed = (Date.now() - start) / 1000;
    if (!resp.ok) {
      const data = await resp.text();
      return `❌ ${model} - ${resp.status} - ${data.substring(0, 80)}`;
    }
    const data = await resp.json();
    if (data.error) {
      return `⚠️ ${model} - ${elapsed.toFixed(1)}s - KEY EXISTS BUT RATE LIMITED: ${data.error.message?.substring(0, 50)}`;
    }
    if (data.candidates && data.candidates[0]) {
      return `✅ ${model} - ${elapsed.toFixed(1)}s`;
    }
    return `❌ ${model} - no candidates`;
  } catch (e) {
    clearTimeout(timeoutId);
    return `❌ ${model} - ${e.name}`;
  }
}

async function run() {
  console.log('=== OpenRouter Models ===');
  for (const m of openrouterModels) {
    process.stdout.write('  Testing ' + m + '...\r');
    console.log(await testOpenRouter(m));
  }

  console.log('\n=== NVIDIA NIM Models ===');
  for (const m of nvidiaModels) {
    process.stdout.write('  Testing ' + m + '...\r');
    console.log(await testNVIDIA(m));
  }

  console.log('\n=== Gemini Models ===');
  for (const m of geminiModels) {
    process.stdout.write('  Testing ' + m + '...\r');
    console.log(await testGemini(m));
  }
}

run().catch(console.error);
