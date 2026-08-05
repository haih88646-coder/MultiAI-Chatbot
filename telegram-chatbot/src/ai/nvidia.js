async function queryNvidiaNim(prompt, conversationHistory, apiKey) {
  if (!apiKey) {
    return '⚠️ NVIDIA NIM API key is not configured. Please contact the bot owner.';
  }

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
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v4-pro',
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
      console.error('Nvidia NIM API Error: request timed out after 120s');
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

async function queryNvidiaNimFlash(prompt, conversationHistory, apiKey) {
  if (!apiKey) {
    return '⚠️ NVIDIA NIM API key is not configured. Please contact the bot owner.';
  }

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
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v4-flash',
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
      console.error('Nvidia NIM Flash API Error: request timed out after 120s');
      return '⚠️ The DeepSeek V4 Flash model is taking too long (it uses extended reasoning). Please try DeepSeek V4 Pro instead.';
    }
    if (error.message.includes('ECONNRESET')) {
      console.error('Nvidia NIM Flash API Error: connection reset by server');
      return '⚠️ Connection was reset by the NVIDIA server. Please try again later or use OpenRouter.';
    }
    console.error('Nvidia NIM Flash API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryNvidiaNim, queryNvidiaNimFlash };
