require('dotenv').config();
const { queryGemini } = require('./src/ai/gemini');
const { queryOpenRouter } = require('./src/ai/openrouter');
const { queryNvidiaNim } = require('./src/ai/nvidia');

async function testAll() {
  const prompt = 'Hello, what is 2+2?';
  const history = [];

  console.log('🧪 Testing AI API keys...\n');

  console.log('--- Gemini ---');
  console.log('Key:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
  if (process.env.GEMINI_API_KEY) {
    const result = await queryGemini(prompt, history, process.env.GEMINI_API_KEY);
    console.log('Result:', result.substring(0, 200));
  }

  console.log('\n--- OpenRouter Models ---');
  console.log('Key:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');

  const openrouterModels = [
    ['openai/gpt-oss-20b:free', 'GPT-OSS 20B'],
    ['cohere/north-mini-code:free', 'Cohere North Mini'],
    ['google/gemma-4-26b-a4b-it:free', 'Gemma 4 26B'],
    ['google/gemma-4-31b-it:free', 'Gemma 4 31B'],
    ['openrouter/free', 'OpenRouter Free Pool'],
  ];

  for (const [model, name] of openrouterModels) {
    if (process.env.OPENROUTER_API_KEY) {
      const result = await queryOpenRouter(prompt, history, process.env.OPENROUTER_API_KEY, model);
      console.log(name + ':', result.substring(0, 200));
    }
  }

  console.log('\n--- NVIDIA NIM Models ---');
  console.log('Key:', process.env.NVIDIA_NIM_API_KEY ? '✅ Set' : '❌ Missing');

  const nvidiaModels = [
    ['mistralai/mistral-nemotron', 'Mistral Nemotron'],
    ['meta/llama-3.1-8b-instruct', 'Llama 3.1 8B'],
  ];

  for (const [model, name] of nvidiaModels) {
    if (process.env.NVIDIA_NIM_API_KEY) {
      const result = await queryNvidiaNim(prompt, history, process.env.NVIDIA_NIM_API_KEY, model);
      console.log(name + ':', result.substring(0, 200));
    }
  }

  console.log('\n✅ Test complete.');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
