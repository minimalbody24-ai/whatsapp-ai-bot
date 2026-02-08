const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a new thread or returns an existing one.
 */
const createThread = async () => {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

/**
 * Adds a message to a thread and runs the assistant.
 */
const processMessage = async (threadId, userMessage) => {
  try {
    // 1. Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage
    });

    // 2. Run the assistant on this thread
    let run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: config.openai.assistantId,
    });

    // 3. Poll for run completion
    while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
      await sleep(1000);
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data.find(m => m.role === 'assistant');
      
      if (lastMessage && lastMessage.content && lastMessage.content.length > 0) {
        const textBlock = lastMessage.content.find(c => c.type === 'text');
        return {
          type: 'reply',
          content: textBlock ? textBlock.text.value : ""
        };
      }
      return { type: 'reply', content: "..." };

    } else if (run.status === 'requires_action') {
      // Handle Function Calling
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      return {
        type: 'action',
        threadId: threadId,
        runId: run.id,
        toolCalls: toolCalls
      };
    } else {
      console.error(`Run failed or expired. Status: ${run.status}`);
      return { type: 'error', content: "Sorry, I had a momentary lapse. Can you say that again?" };
    }

  } catch (error) {
    console.error('Error in processMessage:', error);
    return { type: 'error', content: "System error." };
  }
};

/**
 * Submits the results of tool/function executions back to the run
 */
const submitToolOutputs = async (threadId, runId, toolOutputs) => {
  try {
    let run = await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
      tool_outputs: toolOutputs
    });

    while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
      await sleep(1000);
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data.find(m => m.role === 'assistant');
      const textBlock = lastMessage.content.find(c => c.type === 'text');
      return {
        type: 'reply',
        content: textBlock ? textBlock.text.value : ""
      };
    }
    
    return { type: 'error', content: "Error after tool submission." };

  } catch (error) {
    console.error('Error submitting tool outputs:', error);
    throw error;
  }
};

// ... existing code ...

/**
 * Parses raw text into structured menu data using GPT-4o
 */
const parseMenuDetails = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Nutritionist Assistant. Your goal is to extract structured menu data from raw text (which might be a summary of a client's questionnaire or a direct instruction).
          
          Output JSON format MUST be:
          {
            "clientName": "String (Hebrew)",
            "calories": "String or Number",
            "summary": "String (Short summary of the plan)",
            "meals": {
              "breakfast": "String (Menu option description)",
              "lunch": "String",
              "dinner": "String",
              "snack": "String"
            }
          }

          If information is missing, infer a standard healthy option or leave generic.
          Translate to Hebrew if the input is in English (but usually input is Hebrew).
          `
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error parsing menu details:", error);
    return null;
  }
};

module.exports = {
  createThread,
  processMessage,
  submitToolOutputs,
  parseMenuDetails
};
