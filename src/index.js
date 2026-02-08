const express = require('express');
const config = require('./config');
const openaiService = require('./services/openai');
const ultramsgService = require('./services/ultramsg');
const boostappService = require('./services/boostapp');
const pdfGenerator = require('./services/pdfGenerator');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Map Phone Numbers to Thread IDs
const userThreads = {};

app.get('/', (req, res) => {
  res.send('WhatsApp AI Sales Assistant (Assistants API Version) is running!');
});

app.post('/webhook', async (req, res) => {
  try {
    const data = req.body;

    if (data.data && data.data.from && data.data.body && data.event_type === 'message_received') {
      const from = data.data.from; 
      const messageBody = data.data.body;
      const pushName = data.data.pushname || 'Client';

      // --- ADMIN COMMANDS (Menu Generation) ---
      const cleanFrom = from.replace('@c.us', '');
      const adminPhone = config.humanAgent.phone.replace(/[^0-9]/g, ''); // Ensure clean number

      if (cleanFrom === adminPhone && (messageBody.includes('תפריט') || messageBody.includes('קלוריות') || messageBody.includes('שם:') || messageBody.length > 50)) {
          console.log('Received admin command for menu generation.');
          
          await ultramsgService.sendMessage(from, "קיבלתי! מעבד את הנתונים ומכין את תפריט התזונה... 👨‍🍳");

          // 1. Parse Data
          const menuData = await openaiService.parseMenuDetails(messageBody);

          if (menuData) {
              // 2. Generate PDF
              const tempDir = path.join(__dirname, '../temp');
              if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

              const fileName = `Menu_${Date.now()}.pdf`;
              const filePath = path.join(tempDir, fileName);
              
              await pdfGenerator.generate(menuData, filePath);
              console.log('PDF generated at:', filePath);

              // 3. Send PDF
              await ultramsgService.sendDocument(from, filePath, `תפריט עבור ${menuData.clientName}`);

              // 4. Send Kali Prompt
              const kaliPrompt = `
*העתק את הטקסט הבא עבור קאלי (בוט התזונה):*

שם המתאמן: ${menuData.clientName}
יעד קלורי: ${menuData.calories}
תפריט:
- בוקר: ${menuData.meals.breakfast}
- צהריים: ${menuData.meals.lunch}
- ערב: ${menuData.meals.dinner}
- נשנוש: ${menuData.meals.snack}

הנחיות לבוט: זהו התפריט המאושר. עזרי למתאמן להיצמד אליו, הציעי תחליפים דומים אם נדרש, ועודדי אותו!
`;
              await ultramsgService.sendMessage(from, kaliPrompt);

          } else {
              await ultramsgService.sendMessage(from, "לא הצלחתי לחלץ נתונים ברורים. נסה לשלוח טקסט מפורט יותר (שם, קלוריות, ארוחות).");
          }

          return res.status(200).send('Admin command processed');
      }
      // ----------------------------------------

      if (data.data.fromMe) {
        return res.status(200).send('Message from me, ignoring.');
      }

      console.log(`Received message from ${from}: ${messageBody}`);

      if (!userThreads[from]) {
        console.log(`Creating new thread for ${from}...`);
        userThreads[from] = await openaiService.createThread();
      }
      const threadId = userThreads[from];

      const aiResponse = await openaiService.processMessage(threadId, messageBody);

      if (aiResponse.type === 'action') {
        const toolOutputs = [];
        
        for (const toolCall of aiResponse.toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let output = "{}";

          console.log(`Executing tool: ${functionName} with args:`, args);

          if (functionName === 'schedule_meeting') {
            // 1. Send to Zapier (Boostapp)
            const result = await boostappService.scheduleMeeting({
              firstName: args.first_name,
              lastName: args.last_name,
              phone: args.phone,
              email: args.email,
              preferredTime: args.preferred_time
            });
            
            output = JSON.stringify({ success: true, message: "Meeting request sent." });

            // 2. NEW: Notify the Human Manager immediately!
            if (config.humanAgent.phone) {
              const alertMsg = `🚀 *ליד חדש!*
שם: ${args.first_name} ${args.last_name}
טלפון: ${args.phone}
זמן מבוקש: ${args.preferred_time}
אימייל: ${args.email || 'לא סופק'}

הפרטים נשלחו ל-Zapier.`;
              
              await ultramsgService.sendMessage(config.humanAgent.phone, alertMsg);
              console.log(`Notification sent to human agent: ${config.humanAgent.phone}`);
            }
            
          } else if (functionName === 'escalate_to_human') {
             if (config.humanAgent.phone) {
              await ultramsgService.sendMessage(config.humanAgent.phone, `⚠️ Escalation needed for ${from} (${pushName}). Reason: ${args.reason}`);
            }
            output = JSON.stringify({ success: true, message: "Human agent notified." });
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }

        const finalResponse = await openaiService.submitToolOutputs(threadId, aiResponse.runId, toolOutputs);
        
        if (finalResponse.type === 'reply') {
          await ultramsgService.sendMessage(from, finalResponse.content);
        }

      } else if (aiResponse.type === 'reply') {
        await ultramsgService.sendMessage(from, aiResponse.content);
      } else if (aiResponse.type === 'error') {
         await ultramsgService.sendMessage(from, "Sorry, I'm having a brief technical hiccup.");
      }

    }
    
    res.status(200).send('Event received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ... existing code ...

// NEW: Webhook for Zapier (Google Forms)
app.post('/webhook/forms', async (req, res) => {
    try {
        const formData = req.body; // Zapier will send JSON
        console.log('Received form data:', formData);

        // Extract key fields (Adjust these keys based on what Zapier sends)
        // We assume Zapier sends fields like: name, phone, weight, goal, restrictions
        const clientName = formData.name || formData['שם מלא'] || "מתאמן חדש";
        const phone = formData.phone || formData['טלפון'] || "";
        const goal = formData.goal || formData['מטרה'] || "לא צוין";
        const weight = formData.weight || formData['משקל'] || "לא צוין";
        const restrictions = formData.restrictions || formData['רגישויות'] || "אין";

        // Construct summary message for YOU (The Manager)
        const summaryMsg = `🔔 *התקבל שאלון תזונה חדש!*
👤 שם: ${clientName}
📱 טלפון: ${phone}
⚖️ משקל: ${weight}
🎯 מטרה: ${goal}
⚠️ רגישויות/הערות: ${restrictions}

כדי לייצר תפריט, פשוט השב להודעה זו עם ההנחיות (למשל: "תכין לה תפריט חיטוב 1500 קלוריות, היא אוהבת דגים").`;

        // Send to YOU (Manager)
        if (config.humanAgent.phone) {
            await ultramsgService.sendMessage(config.humanAgent.phone, summaryMsg);
        }

        res.status(200).send('Form processed');
    } catch (error) {
        console.error('Error processing form webhook:', error);
        res.status(500).send('Error');
    }
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
