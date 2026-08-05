async function queryGemini(prompt, conversationHistory, apiKey) {
  if (!apiKey) {
    return '⚠️ Gemini API key is not configured. Please contact the bot owner.';
  }

  try {
    const contents = [];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${response.status}`;
      throw new Error(`Gemini API error: ${msg}`);
    }

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      return data.candidates[0].content.parts[0].text;
    }

    return 'Sorry, I could not generate a response. The model may have blocked the request due to safety filters.';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Gemini API Error: request timed out after 30s');
      return '⚠️ The Gemini API is taking too long to respond. Please try again later.';
    }
    console.error('Gemini API Error:', error.message);
    return `Error: ${error.message}`;
  }
}

module.exports = { queryGemini };
