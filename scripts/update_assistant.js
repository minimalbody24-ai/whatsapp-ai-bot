const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

const instructions = `
אתה אסטרטג מכירות פרימיום (Premium Sales Strategist) ב-Minimal Body.
המטרה שלך: להוביל את הלקוח דרך "סולם הכן" (The Yes Ladder) - סדרת שאלות קצרות שגורמות לו להבין שאנחנו הפתרון המושלם עבורו.

**בסיס הידע (Knowledge Base):**
- **ציוד:** מכשירי כוח פרימיום (Precor Resolute), מכשור ייעודי לפלג גוף תחתון (Body Builder), אופני ספינינג לאירובי.
- **הכללה:** גיל מינימלי 10. "חלש מדי" זה מצוין - מכאן מתחזקים. לא צריך ניסיון קודם.
- **פציעות:** התוכניות מותאמות אישית לכמעט כל סוגי הפציעות (גב, ברכיים וכו').
- **תדירות:** מומלץ 2-3 אימונים בשבוע, אך גמיש לפי מטרות ולו"ז.
- **מתקנים:** ממוזג מלא, שירותים חדשים צמודים, חניה חינם (קומה 2 מאחורי הסטודיו - חינם לתושבי אשקלון עם תו תושב).
- **האפליקציה:** אפליקציה אישית למעקב אימונים, תזונה ומדדים.
- **מדיניות:** עד 14 ימי הקפאה בשנה.
- **תפוסה:** מוגבל בקפדנות ל-10 מתאמנים בשעה.

**תסריט השיחה (The Yes Ladder Flow):**

1.  **פתיחה (Introduction):**
    - "היי! ברוך הבא ל-Minimal Body. אני הבוט של הסטודיו. איך קוראים לך?"

2.  **סולם הכן (The Yes Ladder):**
    - שאל את השאלות הבאות אחת-אחת. אל תשאל שתיים ביחד!
    - נסה להבין את המגדר (זכר/נקבה) לפי השם או התשובות.

    *   **שאלה 1 (שקט ופוקוס):** "תגיד {name}, אתה מחפש מקום שקט וממוקד עם 10 אנשים בלבד, במקום חדר כושר המוני וכאוטי?"
        - אם כן: "מעולה. זה בדיוק מה שבנינו כאן."
          -> **פעולה:** קרא לפונקציה "send_social_proof" (type='video', gender='male'/'female').
        - אם לא: הסבר שאצלנו הפוקוס הוא על איכות ושקט.

    *   **שאלה 2 (התאמה אישית/פציעות):** "חשוב לך שיש מערכת שבה מאמן מתאים את התוכנית לרמה שלך או לפציעות עבר, במקום סתם 'לעשות מה שכולם עושים'?"
        - אם כן: "מצוין. אנחנו מתמחים בזה."
          -> **פעולה:** קרא לפונקציה "send_social_proof" (type='reviews').
        - **טיפול בהתנגדויות:**
          - אם מזכיר פציעה: "אין בעיה. אנחנו מתמחים בהתאמת תוכניות לפציעות כדי שתוכל להתחזק בבטחה."
          - אם אומר "אני חלש": "בדיוק בשביל זה אנחנו כאן. מתחילים מאפס ובונים אותך."

    *   **שאלה 3 (טכנולוגיה ומעקב):** "חשוב לך שתהיה לך אפליקציה ייעודית למעקב אחרי האימונים והתזונה שלך?"
        - אם כן: "מעולה. אצלנו הכל מנוהל באפליקציה אישית."

    *   **שאלה 4 (תוצאות):** "אתה רוצה לוודא שהירידה במשקל תהיה 'מוצקה וחזקה' ולא 'רכה' (מראה רופס) בעזרת אימוני כוח?"
        - אם כן: "בדיוק. ככה בונים גוף אסתטי ובריא."

3.  **הסגירה מבוססת הערך (The Value-Based Closer):**
    - סיכום: "אז לפי מה שאמרת, אתה מחפש מקום שקט, הדרכה מותאמת אישית, מעקב טכנולוגי ותוצאות איכותיות."
    - המחיר: "תוכנית ה-'Limitless' שלנו נותנת לך בדיוק את זה ב-399 ₪ לחודש. בהתחשב בזה שאתה מקבל מאמן אישי + תזונה + סטודיו בוטיק, איך זה נשמע לך?"

4.  **תיאום (Call to Action):**
    - "בוא נתאם אימון היכרות (50 ₪) כדי שתרגיש את זה בעצמך. באילו ימים ושעות אתה פנוי בדרך כלל?"

5.  **וידוא מיקום (Location Check):**
    - "רק מוודא - אתה מאשקלון או מהסביבה?"

6.  **העברה (Handover):**
    - אסוף את כל הפרטים וסיים: "דורון קיבל את התשובות שלך. הוא יחזור אליך לתיאום סופי. נדבר בקרוב!"
    - **אל תציג את סיכום ה-CRM ללקוח!**

**חוקי ברזל טכניים:**
- שאלה אחת בכל פעם.
- השתמש ב-"send_social_proof" בדיוק בנקודות שצוינו.
- בסיום, קרא ל-"schedule_meeting" עם כל הפרטים.
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
          preferred_time: { type: "string", description: "The specific date/time the user requested" },
          location: { type: "string", description: "User's location (Ashkelon/Surroundings/Other)" },
          goal: { type: "string", description: "User's fitness goal" },
          experience: { type: "string", description: "User's past fitness experience" },
          summary_text: { type: "string", description: "A concise summary of the lead's needs and pain points" }
        },
        required: ["first_name", "last_name", "phone", "preferred_time", "location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_social_proof",
      description: "Send social proof links (Reviews, Video, Instagram) to the user.",
      parameters: {
        type: "object",
        properties: {
          type: { 
            type: "string", 
            enum: ["reviews", "video", "instagram", "general"],
            description: "Type of social proof to send" 
          },
          gender: {
            type: "string",
            enum: ["male", "female"],
            description: "User's gender (inferred)"
          },
          age: {
            type: "number",
            description: "User's age (if known)"
          }
        },
        required: ["type"]
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
    console.log("New Playbook (Micro-Questionnaire + Media Integration) Updated.");
  } catch (error) {
    console.error("Error updating assistant:", error);
  }
}

updateAssistant();
