const fetch = require('node-fetch');

async function queryNvidiaNim(prompt, conversationHistory, apiKey) {
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

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: messages,
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Nvidia NIM API error');
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    return 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Nvidia NIM API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryNvidiaNim };