const fetch = require('node-fetch');

async function queryOpenRouter(prompt, conversationHistory, apiKey) {
  if (!apiKey) {
    return '⚠️ OpenRouter API key is not configured. Please contact the bot owner.';
  }

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Telegram AI Chatbot'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      }),
      timeout: 30000
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${response.status}`;
      throw new Error(`OpenRouter API error: ${msg}`);
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    return 'Sorry, I could not generate a response. The model may have been blocked or unavailable.';
  } catch (error) {
    console.error('OpenRouter API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryOpenRouter };
