const fetch = require('node-fetch');

async function queryNvidiaNim(prompt, conversationHistory, apiKey) {
  try {
    const messages = [];

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
          model: 'deepseek-ai/deepseek-v4-pro',
          messages: messages,
          temperature: 1,
          top_p: 0.95,
          max_tokens: 16384,
          extra_body: {
            chat_template_kwargs: {
              thinking: false
            }
          }
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

async function queryNvidiaNimFlash(prompt, conversationHistory, apiKey) {
  try {
    const messages = [];

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
          model: 'deepseek-ai/deepseek-v4-flash',
          messages: messages,
          temperature: 1,
          top_p: 0.95,
          max_tokens: 16384,
          extra_body: {
            chat_template_kwargs: {
              thinking: true,
              reasoning_effort: 'high'
            }
          }
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

module.exports = { queryNvidiaNim, queryNvidiaNimFlash };
