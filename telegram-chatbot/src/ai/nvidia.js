const DEFAULT_NVIDIA_MODEL = 'mistralai/mistral-nemotron';
const NVIDIA_MODELS = {
  'mistralai/mistral-nemotron': { display: 'Mistral Nemotron', speed: 'fast', maxTokens: 4096 },
  'meta/llama-3.1-8b-instruct': { display: 'Llama 3.1 8B', speed: 'medium', maxTokens: 4096 },
  'thinkingmachines/inkling': { display: 'ThinkingMachines Inkling', speed: 'fast', maxTokens: 16384 },
  'deepseek-ai/deepseek-v4-flash': { display: 'DeepSeek V4 Flash', speed: 'slow', maxTokens: 16384 },
};

async function queryNvidiaNim(prompt, conversationHistory, apiKey, modelName) {
  if (!apiKey) {
    return '⚠️ NVIDIA NIM API key is not configured. Please contact the bot owner.';
  }

  const model = modelName && NVIDIA_MODELS[modelName] ? modelName : DEFAULT_NVIDIA_MODEL;
  const maxTokens = NVIDIA_MODELS[model]?.maxTokens || 4096;
  const timeoutMs = NVIDIA_MODELS[model]?.speed === 'slow' ? 90000 : 60000;

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Answer questions accurately and concisely.'
        }
      ];

      if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
            max_tokens: maxTokens
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const msg = data.detail || data.error?.message || data.error || data.message || `HTTP ${response.status}`;
        
        // Retry on 529 (service overloaded) or 503 (service unavailable)
        if (response.status === 529 || response.status === 503) {
          console.error(`Nvidia NIM API Error (attempt ${attempt}/${MAX_RETRIES}): ${msg}`);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            continue;
          }
          return `⚠️ ${NVIDIA_MODELS[model]?.display || model} is temporarily overloaded (${response.status}). Please try again in a few moments or use OpenRouter instead.`;
        }
        
        throw new Error(`NVIDIA NIM API error: ${msg}`);
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }

      return 'Sorry, I could not generate a response. The model may have been blocked or unavailable.';
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Nvidia NIM API Error: ${model} timed out after ${timeoutMs / 1000}s`);
        return `⚠️ ${NVIDIA_MODELS[model]?.display || model} is taking too long (timeout ${timeoutMs / 1000}s). Please try a different model.`;
      }
      if (error.message.includes('ECONNRESET')) {
        console.error('Nvidia NIM API Error: connection reset by server');
        return '⚠️ Connection was reset by the NVIDIA server. Please try again later or use OpenRouter.';
      }
      if (error.message.includes('NVIDIA NIM API error')) {
        // Re-throw API errors to be caught by the retry logic
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          continue;
        }
      }
      console.error('Nvidia NIM API Error:', error.message);
      return `Error: ${error.message}`;
    }
  }
}

module.exports = { queryNvidiaNim, NVIDIA_MODELS, DEFAULT_NVIDIA_MODEL };
