require('dotenv').config();
const { queryOpenRouter } = require('./src/ai/openrouter');
const { queryNvidiaNim } = require('./src/ai/nvidia');

async function testAll() {
  const prompt = 'Hello, what is 2+2?';
  const history = [];

  console.log('🧪 Testing AI API keys...\n');

  console.log('--- OpenRouter ---');
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

  console.log('\n--- NVIDIA NIM ---');
  console.log('Key:', process.env.NVIDIA_NIM_API_KEY ? '✅ Set' : '❌ Missing');

  const nvidiaModels = [
    ['mistralai/mistral-nemotron', 'Mistral Nemotron'],
    ['meta/llama-3.1-8b-instruct', 'Llama 3.1 8B'],
    ['thinkingmachines/inkling', 'Inkling'],
  ];

  for (const [model, name] of nvidiaModels) {
    if (process.env.NVIDIA_NIM_API_KEY) {
      const result = await queryNvidiaNim(prompt, history, process.env.NVIDIA_NIM_API_KEY, model);
      console.log(name + ':', result.substring(0, 200));
    }
  }

  console.log('\n--- NVIDIA NIM (DeepSeek V4 Flash — slow) ---');
  if (process.env.NVIDIA_NIM_API_KEY) {
    const result = await queryNvidiaNim(prompt, history, process.env.NVIDIA_NIM_API_KEY, 'deepseek-ai/deepseek-v4-flash');
    console.log('DeepSeek V4 Flash:', result.substring(0, 200));
  }

  console.log('\n✅ Test complete.');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
