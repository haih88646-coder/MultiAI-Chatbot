const DEFAULT_NVIDIA_MODEL = 'mistralai/mistral-nemotron';
const NVIDIA_MODELS = {
  'mistralai/mistral-nemotron': { display: 'Mistral Nemotron', speed: 'fast' },
  'meta/llama-3.1-8b-instruct': { display: 'Llama 3.1 8B', speed: 'medium' },
};

async function queryNvidiaNim(prompt, conversationHistory, apiKey, modelName) {
  if (!apiKey) {
    return '⚠️ NVIDIA NIM API key is not configured. Please contact the bot owner.';
  }

  const model = modelName && NVIDIA_MODELS[modelName] ? modelName : DEFAULT_NVIDIA_MODEL;

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Answer questions accurately and concisely.'
      }
    ];

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
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 1,
          top_p: 0.95,
          max_tokens: 16384
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.error?.message || data.error || data.message || `HTTP ${response.status}`;
      throw new Error(`NVIDIA NIM API error: ${msg}`);
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    return 'Sorry, I could not generate a response. The model may have been blocked or unavailable.';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Nvidia NIM API Error: request timed out after 60s');
      return '⚠️ The model is taking too long to respond. Please try again later or use a different model.';
    }
    if (error.message.includes('ECONNRESET')) {
      console.error('Nvidia NIM API Error: connection reset by server');
      return '⚠️ Connection was reset by the NVIDIA server. Please try again later or use OpenRouter.';
    }
    console.error('Nvidia NIM API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryNvidiaNim, NVIDIA_MODELS, DEFAULT_NVIDIA_MODEL };
