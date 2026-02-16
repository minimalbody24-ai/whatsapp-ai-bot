const express = require('express');
const config = require('./config');
const openaiService = require('./services/openai');
const whatsappService = require('./services/greenapi'); 
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
  res.send('WhatsApp AI Sales Assistant (Green-API Version) is running!');
});

// Helper to notify admin
const notifyAdmin = async (message) => {
    if (config.humanAgent.phone) {
        try {
            await whatsappService.sendMessage(config.humanAgent.phone, `🚨 *System Alert*\n${message}`);
        } catch (err) {
            console.error('Failed to notify admin:', err);
        }
    }
};

app.post('/webhook', async (req, res) => {
  try {
    const data = req.body;
    
    // Green-API Payload Structure Handling
    // We are looking for 'incomingMessageReceived' type
    if (data.typeWebhook === 'incomingMessageReceived' || data.typeWebhook === 'outgoingMessageReceived') {
        const senderData = data.senderData;
        const messageData = data.messageData;

        // Extract sender phone number (clean it)
        const from = senderData.chatId; // e.g., "972501234567@c.us"
        const cleanFrom = from.replace('@c.us', '');
        
        // Extract message body (text)
        let messageBody = "";
        if (messageData.typeMessage === 'textMessage') {
            messageBody = messageData.textMessageData.textMessage;
        } else if (messageData.typeMessage === 'extendedTextMessage') {
            messageBody = messageData.extendedTextMessageData.text;
        }

        // Ignore empty messages or non-text for now
        if (!messageBody) {
            return res.status(200).send('Non-text message received');
        }

        console.log(`Received message from ${cleanFrom}: ${messageBody}`);

        // --- RESET COMMAND ---
        if (messageBody.toLowerCase() === 'reset' || messageBody === 'התחל מחדש') {
            console.log(`Resetting thread for ${from}`);
            userThreads[from] = await openaiService.createThread();
            await whatsappService.sendMessage(from, "הזיכרון נמחק. בוא נתחיל מחדש! היי, איך קוראים לך?");
            return res.status(200).send('Thread reset');
        }
        // ---------------------

        const pushName = senderData.senderName || 'Client';
        const adminPhone = config.humanAgent.phone.replace(/[^0-9]/g, '');

        // --- ADMIN COMMANDS (Menu Generation) ---
        // Require explicit command words like "create menu" or "תכין" to avoid triggering on casual chat about calories
        const isMenuCommand = (messageBody.includes('תכין') || messageBody.includes('צור') || messageBody.includes('create')) && 
                              (messageBody.includes('תפריט') || messageBody.includes('menu'));

        if (cleanFrom === adminPhone && isMenuCommand) {
            // Check if it is outgoing message (from me to bot on same number) or incoming (from me to bot number if different)
            // Green-API 'outgoingMessageReceived' means I sent it from my phone.
            // If I am the admin, I want to process my own commands.
            
            console.log('Received admin command for menu generation.');
            
            await whatsappService.sendMessage(from, "קיבלתי! מעבד את הנתונים ומכין את תפריט התזונה... 👨‍🍳");

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
                await whatsappService.sendDocument(from, filePath, `תפריט עבור ${menuData.clientName}`);

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
                await whatsappService.sendMessage(from, kaliPrompt);

            } else {
                await whatsappService.sendMessage(from, "לא הצלחתי לחלץ נתונים ברורים. נסה לשלוח טקסט מפורט יותר (שם, קלוריות, ארוחות).");
            }

            return res.status(200).send('Admin command processed');
        }
        // ----------------------------------------

        // If it's an outgoing message (I sent it) and it wasn't a command, ignore it to prevent loops/self-talk
        if (data.typeWebhook === 'outgoingMessageReceived') {
             return res.status(200).send('Ignoring outgoing message');
        }

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
                    // 1. Notify Admin (Priority)
                    if (config.humanAgent.phone) {
                        const alertMsg = `📝 **תיעוד ליד ל-CRM (Minimalbody)**
- שם: ${args.first_name} ${args.last_name}
- טלפון: ${args.phone}
- אזור מגורים: ${args.location || 'לא צוין'}
- מטרה: ${args.goal || 'לא צוין'}
- ניסיון: ${args.experience || 'לא צוין'}
- זמינות: ${args.preferred_time}
- דגשים: ${args.summary_text || 'אין דגשים מיוחדים'}`;
                        
                        try {
                            await whatsappService.sendMessage(config.humanAgent.phone, alertMsg);
                            console.log('Admin notification sent.');
                        } catch (err) {
                            console.error('Failed to send admin notification:', err);
                        }
                    }

                    // 2. Try BoostApp (Optional)
                    try {
                        await boostappService.scheduleMeeting({
                            firstName: args.first_name,
                            lastName: args.last_name,
                            phone: args.phone,
                            email: args.email,
                            preferredTime: args.preferred_time
                        });
                    } catch (err) {
                        console.error('BoostApp scheduling failed:', err);
                    }
                    
                    output = JSON.stringify({ success: true, message: "Meeting request processed." });

                } else if (functionName === 'send_social_proof') {
                    console.log(`[Social Proof] Args received:`, args);
                    
                    const type = args.type || 'general';
                    const gender = (args.gender || 'unknown').toLowerCase();
                    const age = args.age || 0;

                    let message = "";
                    
                    if (type === 'reviews') {
                        message = `⭐ *מה מתאמנים מספרים עלינו:*
לקוחות משתפים בחוויות שלהם בגוגל:
${config.social.googleReviews}

אנחנו גאים בכל אחד ואחת מהם!`;
                    } else if (type === 'video') {
                        // Safe access to video config
                        const videos = config.social.videos || {};
                        let videoUrl = config.social.instagram; // Default fallback
                        
                        if (gender === 'male' && videos.male) {
                            videoUrl = videos.male;
                        } else if (gender === 'female' && videos.female) {
                            videoUrl = videos.female;
                        } else {
                            videoUrl = config.social.instagram;
                        }

                        console.log(`[Social Proof] Selected video URL: ${videoUrl} for gender: ${gender}`);

                        message = `🎥 *קצת מהאווירה בסטודיו:*
מוזמן להציץ בסרטון קצר:
${videoUrl}`;

                    } else if (type === 'instagram') {
                         message = `🎥 *האינסטגרם שלנו:*
מוזמן לעקוב ולראות את האווירה בסטודיו:
${config.social.instagram}`;
                    } else {
                        // General case
                        message = `⭐ *הוכחות מהשטח:*
                        
👀 *האינסטגרם שלנו:* ${config.social.instagram}
💬 *ביקורות בגוגל:* ${config.social.googleReviews}`;
                    }

                    try {
                        const sent = await whatsappService.sendMessage(from, message);
                        if (sent) {
                             console.log(`[Social Proof] Message sent successfully to ${from}`);
                             output = JSON.stringify({ success: true, message: "Social proof sent." });
                        } else {
                             console.error(`[Social Proof] Failed to send message to ${from}`);
                             output = JSON.stringify({ success: false, message: "Failed to send message via WhatsApp provider." });
                        }
                    } catch (error) {
                        console.error(`[Social Proof] Exception sending message:`, error);
                        output = JSON.stringify({ success: false, message: "Error sending message." });
                    }

                } else if (functionName === 'escalate_to_human') {
                    if (config.humanAgent.phone) {
                        await whatsappService.sendMessage(config.humanAgent.phone, `⚠️ Escalation needed for ${from} (${pushName}). Reason: ${args.reason}`);
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
                await whatsappService.sendMessage(from, finalResponse.content);
            }

        } else if (aiResponse.type === 'reply') {
            await whatsappService.sendMessage(from, aiResponse.content);
        } else if (aiResponse.type === 'error') {
            await whatsappService.sendMessage(from, "Sorry, I'm having a brief technical hiccup.");
        }
    }
    
    res.status(200).send('Event received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Notify Admin about critical failures
    await notifyAdmin(`Critical Error in Webhook:\n${error.message || error}`);
    
    res.status(500).send('Internal Server Error');
  }
});

// NEW: Webhook for Zapier (Google Forms) - Remains same logic, just uses whatsappService
app.post('/webhook/forms', async (req, res) => {
    try {
        const formData = req.body; 
        console.log('Received form data:', formData);

        const clientName = formData.name || formData['שם מלא'] || "מתאמן חדש";
        const phone = formData.phone || formData['טלפון'] || "";
        
        let fullDetails = "";
        const ignoredKeys = ['name', 'phone', 'email', 'weight', 'goal', 'restrictions'];

        if (formData.weight) fullDetails += `⚖️ משקל: ${formData.weight}\n`;
        if (formData.goal) fullDetails += `🎯 מטרה: ${formData.goal}\n`;
        if (formData.restrictions) fullDetails += `⚠️ רגישויות: ${formData.restrictions}\n`;
        
        fullDetails += `\n\n📝 *שאר התשובות מהשאלון:*\n\n`;

        for (const [key, value] of Object.entries(formData)) {
            if (ignoredKeys.includes(key)) continue;
            if (!value || value === "") continue;
            fullDetails += `🔹 *${key}*: ${value}\n\n`;
        }

        const summaryMsg = `🔔 *התקבל שאלון תזונה חדש!*
👤 שם: ${clientName}
📱 טלפון: ${phone}

${fullDetails}

-----------------------------
כדי לייצר תפריט, פשוט השב להודעה זו עם ההנחיות (למשל: "תכין לה תפריט חיטוב 1500 קלוריות...").`;

        if (config.humanAgent.phone) {
            await whatsappService.sendMessage(config.humanAgent.phone, summaryMsg);
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
