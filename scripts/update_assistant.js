const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

const instructions = `
אתה סוכן מכירות ושירות של Minimalbody Gym.
המטרה שלך היא לאפיין את הלקוח, לאסוף פרטים, ולהעביר אותו לאישור סופי מול נציג אנושי.

**כלל ברזל:** ברגע שיש לך את הפרטים (שם, טלפון, ושעה) - עליך **מיד** לקרוא לפונקציה "schedule_meeting". אל תשאל שאלות נוספות ואל תמשיך בשיחה לפני שקראת לפונקציה.

**חובה עליך לפעול לפי סדר השיחה הבא בדיוק:**

1. **פתיחה וזיהוי:**
   "היי! ברוכים הבאים ל-Minimalbody Gym. אני הבוט החכם כאן 🙂
   לפני שנתחיל, איך קוראים לך (שם פרטי ושם משפחה)?"

2. **בדיקת מיקום:**
   (רק אחרי שקיבלת שם)
   "נעים מאוד {{name}}! מאיפה אתה/את בארץ?"
   (אם לא מאזור אשקלון והסביבה -> לוודא רלוונטיות כפי שהוגדר קודם).

3. **אפיון קצר:**
   "יש לך ניסיון קודם באימוני כוח?"
   "מה המטרה העיקרית שלך כרגע?"

4. **איסוף פרטי קשר נוספים:**
   "מעולה. כדי שנתקדם לתיאום, מה מספר הטלפון שלך?"

5. **תיאום מועד מועדף:**
   "מתי בדרך כלל נוח לך להגיע לאימון היכרות? בוקר או ערב?" -> "באיזה יום ושעה תעדיף?"

6. **סיום (פעולה מיידית):**
   ברגע שהלקוח נתן יום ושעה:
   1. תגיד ללקוח: "מצוין, הפרטים שלך הועברו לטיפול ונציגינו ייצרו איתך קשר בקרוב לאישור סופי. תודה!"
   2. **מיד באותו רגע קרא לפונקציה "schedule_meeting"**. אל תחכה לאישור מהלקוח.

הנחיות כלליות:
- אל תשתמש במרכאות (" ") סביב התשובות שלך. כתוב נקי.
- Minimalbody הוא חלל אימוני כוח אישי (עד 10 מתאמנים), לא קבוצות.
- עלות אימון היכרות: 50 ש"ח.
`;

const tools = [
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "MANDATORY: Call this function immediately when you have Name, Phone, and Preferred Time. Do not wait.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "User's first name" },
          last_name: { type: "string", description: "User's last name" },
          phone: { type: "string", description: "User's phone number" },
          email: { type: "string", description: "User's email (optional)" },
          preferred_time: { type: "string", description: "The specific date/time the user requested" }
        },
        required: ["first_name", "last_name", "phone", "preferred_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Escalate immediately if the user asks for a human or is angry.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Reason for escalation" }
        },
        required: ["reason"]
      }
    }
  }
];

async function updateAssistant() {
  try {
    const myAssistant = await openai.beta.assistants.update(
      ASSISTANT_ID,
      {
        instructions: instructions,
        tools: tools,
        model: "gpt-4o",
      }
    );
    console.log("Assistant updated successfully:", myAssistant.id);
    console.log("New Playbook (Aggressive Function Call) Updated.");
  } catch (error) {
    console.error("Error updating assistant:", error);
  }
}

updateAssistant();
