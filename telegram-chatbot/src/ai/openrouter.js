const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-oss-20b:free';
const OPENROUTER_MODELS = {
  'openai/gpt-oss-20b:free': { display: 'GPT-OSS 20B', speed: 'fast' },
  'cohere/north-mini-code:free': { display: 'Cohere North Mini', speed: 'fast' },
  'google/gemma-4-26b-a4b-it:free': { display: 'Gemma 4 26B', speed: 'fast' },
  'google/gemma-4-31b-it:free': { display: 'Gemma 4 31B', speed: 'medium' },
  'openrouter/free': { display: 'OpenRouter Free Pool', speed: 'fast' },
};

async function queryOpenRouter(prompt, conversationHistory, apiKey, modelName) {
  if (!apiKey) {
    return '⚠️ OpenRouter API key is not configured. Please contact the bot owner.';
  }

  const model = modelName && OPENROUTER_MODELS[modelName] ? modelName : DEFAULT_OPENROUTER_MODEL;

  try {
    const messages = [];

    // Add system message
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant. Answer questions accurately and concisely.'
    });

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: prompt
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Telegram AI Chatbot'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${response.status}`;
      if (msg.includes('guardrail restrictions') || msg.includes('privacy')) {
        throw new Error(`OpenRouter API error: Privacy settings required. Visit https://openrouter.ai/settings/privacy to configure. Model: ${model}`);
      }
      throw new Error(`OpenRouter API error: ${msg} (Model: ${model})`);
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    return 'Sorry, I could not generate a response. The model may have been blocked or unavailable.';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenRouter API Error: request timed out after 30s');
      return '⚠️ The OpenRouter API is taking too long to respond. Please try again later.';
    }
    console.error('OpenRouter API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryOpenRouter, OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODEL };
