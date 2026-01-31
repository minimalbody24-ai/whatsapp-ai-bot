const express = require('express');
const config = require('./config');
const openaiService = require('./services/openai');
const ultramsgService = require('./services/ultramsg');
const boostappService = require('./services/boostapp');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store conversation history in memory (Note: use a database like MongoDB/PostgreSQL in production)
const sessions = {};

app.get('/', (req, res) => {
  res.send('WhatsApp AI Sales Assistant is running!');
});

app.post('/webhook', async (req, res) => {
  try {
    const data = req.body;

    // Check if data is valid and has the message structure we expect from UltraMsg
    if (data.data && data.data.from && data.data.body && data.event_type === 'message_received') {
      const from = data.data.from; // Phone number
      const messageBody = data.data.body;
      const pushName = data.data.pushname || 'Client';

      // Avoid infinite loops if the message is from ourselves (though UltraMsg usually filters this via event_type)
      if (data.data.fromMe) {
        return res.status(200).send('Message from me, ignoring.');
      }

      console.log(`Received message from ${from}: ${messageBody}`);

      // Retrieve or initialize history
      if (!sessions[from]) {
        sessions[from] = [];
      }
      const history = sessions[from];

      // 1. Parse and understand intent using OpenAI
      const aiResponse = await openaiService.generateResponse(messageBody, history);

      // 2. Handle the AI's decision
      if (aiResponse.type === 'action') {
        const toolCall = aiResponse.toolCalls[0];
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === 'schedule_meeting') {
          // Action: Schedule in Boostapp
          console.log(`Intent detected: Schedule Meeting. Args: ${JSON.stringify(args)}`);
          await boostappService.scheduleMeeting(pushName, from, args.preferred_time);
          
          // Reply to user
          const replyText = "I'm checking the schedule for you. A representative will confirm the time shortly.";
          await ultramsgService.sendMessage(from, replyText);
          
          // Add to history
          history.push({ role: 'user', content: messageBody });
          history.push({ role: 'assistant', content: replyText });

        } else if (functionName === 'escalate_to_human') {
          // Action: Escalate
          console.log(`Intent detected: Escalate to Human. Reason: ${args.reason}`);
          
          // Notify human agent (could be another WhatsApp msg or email)
          if (config.humanAgent.phone) {
            await ultramsgService.sendMessage(config.humanAgent.phone, `⚠️ Escalation needed for ${from} (${pushName}). Reason: ${args.reason}`);
          }

          const replyText = "I'm connecting you with a specialist who can help better. They will be with you shortly.";
          await ultramsgService.sendMessage(from, replyText);
          
          history.push({ role: 'user', content: messageBody });
          history.push({ role: 'assistant', content: replyText });
        }

      } else if (aiResponse.type === 'reply') {
        // Standard reply
        const replyText = aiResponse.content;
        await ultramsgService.sendMessage(from, replyText);

        // Update history
        history.push({ role: 'user', content: messageBody });
        history.push({ role: 'assistant', content: replyText });
      }

      // Limit history length to save tokens
      if (sessions[from].length > 20) {
        sessions[from] = sessions[from].slice(-20);
      }

    }
    
    res.status(200).send('Event received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
