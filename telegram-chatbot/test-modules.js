require('dotenv').config();
const { queryGemini } = require('./src/ai/gemini');
const { queryOpenRouter } = require('./src/ai/openrouter');
const { queryNvidiaNim, queryNvidiaNimFlash } = require('./src/ai/nvidia');

async function testAll() {
  const prompt = 'Hello, what is 2+2?';
  const history = [];

  console.log('🧪 Testing AI API keys...\n');

  console.log('--- Gemini ---');
  console.log('Key:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
  if (process.env.GEMINI_API_KEY) {
    const result = await queryGemini(prompt, history, process.env.GEMINI_API_KEY);
    console.log('Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
  }

  console.log('\n--- OpenRouter ---');
  console.log('Key:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');
  if (process.env.OPENROUTER_API_KEY) {
    const result = await queryOpenRouter(prompt, history, process.env.OPENROUTER_API_KEY);
    console.log('Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
  }

  console.log('\n--- NVIDIA NIM (DeepSeek V4 Pro) ---');
  console.log('Key:', process.env.NVIDIA_NIM_API_KEY ? '✅ Set' : '❌ Missing');
  if (process.env.NVIDIA_NIM_API_KEY) {
    const result = await queryNvidiaNim(prompt, history, process.env.NVIDIA_NIM_API_KEY);
    console.log('Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
  }

  console.log('\n--- NVIDIA NIM (DeepSeek V4 Flash) ---');
  if (process.env.NVIDIA_NIM_API_KEY) {
    const result = await queryNvidiaNimFlash(prompt, history, process.env.NVIDIA_NIM_API_KEY);
    console.log('Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
  }

  console.log('\n✅ Test complete.');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
