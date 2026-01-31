const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const SYSTEM_PROMPT = `
You are a warm, helpful AI Sales Assistant for a business.
Your goals are:
1. Answer client questions intelligently.
2. Warm up leads through conversation.
3. Identify when a client wants to schedule a meeting or speak to a human.

If the client wants to book a meeting or asks "When can I talk?", "I want to book", etc., your goal is to ask for their preferred time or guide them to booking.
If the client seems frustrated, unsure, or asks for a real person, suggest connecting them to a human agent.

You should reply in the same language as the user (Hebrew/English).
`;

const generateResponse = async (userMessage, history = []) => {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Using function calling to detect intent structuredly
    const tools = [
      {
        type: "function",
        function: {
          name: "schedule_meeting",
          description: "Trigger this when the user expresses a clear desire to schedule a meeting or call.",
          parameters: {
            type: "object",
            properties: {
              preferred_time: {
                type: "string",
                description: "The preferred time or date mentioned by the user, if any."
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "escalate_to_human",
          description: "Trigger this when the user asks for a human, seems frustrated, or the query is too complex.",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for escalation."
              }
            },
            required: ["reason"]
          }
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo
      messages: messages,
      tools: tools,
      tool_choice: "auto", 
    });

    const responseMessage = response.choices[0].message;

    // Check if a tool call was made
    if (responseMessage.tool_calls) {
      return {
        type: 'action',
        toolCalls: responseMessage.tool_calls,
        content: responseMessage.content // Might be null if tool called directly
      };
    }

    return {
      type: 'reply',
      content: responseMessage.content
    };

  } catch (error) {
    console.error('Error with OpenAI:', error);
    return { type: 'error', content: "I'm having trouble processing that right now." };
  }
};

module.exports = {
  generateResponse,
};
