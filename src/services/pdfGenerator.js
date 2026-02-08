const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Basic reverser for Hebrew text
const reverse = (str) => {
  if (!str) return "";
  // Keep english/numbers as is if possible? 
  // For mixed content this is hard without bidi library.
  // For now, simple reverse.
  return str.split("").reverse().join("");
};

// Helper to reverse sentences but keep words intact? 
// Actually for PDFKit standard, simple reverse of the whole string is usually what's needed for RTL 
// if we don't use 'features: ["rtla"]'.
// Let's try simple reverse first.

const FONTS = {
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
};

class NutritionPlanGenerator {
    constructor() {
        this.doc = null;
    }

    generate(data, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                this.doc = new PDFDocument({
                    size: 'A4',
                    margin: 40,
                    layout: 'portrait'
                });

                const writeStream = fs.createWriteStream(outputPath);
                this.doc.pipe(writeStream);

                // Register Fonts
                this.doc.registerFont('Arial', FONTS.regular);
                this.doc.registerFont('Arial-Bold', FONTS.bold);

                // --- PAGE 1: The Menu ---
                this.addDisclaimer();
                this.addHeader(data.clientName, data.calories);
                this.addMeals(data.meals);
                this.addFooterSummary(data.calories);
                
                // --- PAGE 2: Guidelines ---
                this.doc.addPage();
                this.addDisclaimer();
                this.addGuidelines();

                this.doc.end();

                writeStream.on('finish', () => {
                    resolve(outputPath);
                });

                writeStream.on('error', (err) => {
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    addDisclaimer() {
        const text = "מסמך זה אינו מהווה תחליף להתוויה רפואית. חובה להיבדק ע״י רופא לפני תחילת התהליך.";
        this.doc
            .font('Arial')
            .fontSize(8)
            .fillColor('#7f8c8d')
            .text(reverse(text), { align: 'center' });
        this.doc.moveDown(1);
    }

    addHeader(name, calories) {
        this.doc
            .font('Arial-Bold')
            .fontSize(26)
            .fillColor('#000000')
            .text(reverse(`תפריט יומי – ${name}`), { align: 'center' });
        
        this.doc.moveDown(0.2);

        this.doc
            .font('Arial')
            .fontSize(16)
            .text(reverse(`יעד יומי: כ- ${calories} קלוריות`), { align: 'center' });

        this.doc.moveDown(2);
    }

    addMeals(meals) {
        // meals is array of { title, options: [] }
        // We expect specific keys or just iterate whatever is passed.
        // Let's standardize:
        
        const sections = [
            { 
                key: 'breakfast', 
                label: 'ארוחת בוקר (רשות)', 
                time: '07:00-10:00',
                icon: '☕'
            },
            { 
                key: 'lunch', 
                label: 'ארוחת צהריים (עיקרית)', 
                time: '12:00-14:00',
                icon: '🍽️'
            },
            { 
                key: 'dinner', 
                label: 'ארוחת ערב', 
                time: '19:00-21:00',
                icon: '🌙'
            },
            { 
                key: 'snack', 
                label: 'נשנוש / מתוק', 
                time: 'אופציונלי',
                icon: '🍫'
            }
        ];

        sections.forEach(sec => {
            const content = meals[sec.key];
            if (!content) return;

            // Section Header
            this.doc
                .rect(40, this.doc.y, 515, 30) // Background strip
                .fill('#f5f5f5');
            
            this.doc.fill('#000000'); // Reset text color

            // Title (Right aligned)
            this.doc
                .font('Arial-Bold')
                .fontSize(14)
                .text(reverse(`${sec.icon} ${sec.label}`), 50, this.doc.y + 7, { align: 'right', width: 495 });
            
            this.doc.moveDown(1.5);

            // Content
            this.doc
                .font('Arial')
                .fontSize(12)
                .text(reverse(content), { align: 'right', indent: 0 });

            this.doc.moveDown(1.5);
        });
    }

    addFooterSummary(calories) {
        this.doc.moveDown(1);
        this.doc
            .moveTo(40, this.doc.y)
            .lineTo(555, this.doc.y)
            .lineWidth(2)
            .strokeColor('#000000')
            .stroke();

        this.doc.moveDown(1);
        
        this.doc
            .font('Arial-Bold')
            .fontSize(16)
            .text(reverse(`סה״כ יומי: כ-${calories} קלוריות`), { align: 'center' });
    }

    addGuidelines() {
        this.doc.moveDown(2);
        this.doc
            .font('Arial-Bold')
            .fontSize(22)
            .text(reverse('הנחיות כלליות לתפריט'), { align: 'center', underline: true });

        this.doc.moveDown(2);

        const bullets = [
            "התפריט מודולרי: ניתן להחליף בין הארוחות (למשל, לאכול את ארוחת הערב בצהריים).",
            "שתייה: מומלץ לשתות לפחות 2-3 ליטר מים ביום.",
            "ירקות: ירקות ירוקים הם חופשיים (מלפפון, חסה, כרוב, קישוא).",
            "תיבול: מלח, פלפל, עשבי תיבול, לימון, חומץ - חופשי. שמן - למדוד.",
            "טיגון: יש להימנע מטיגון עמוק. עדיף אפייה, בישול או טיגון קל עם ספריי שמן.",
            "שינה: שינה טובה (7-8 שעות) קריטית לתהליך החיטוב/מסה.",
            "אימון: יש להקפיד על צריכת חלבון נאותה בימים של אימון."
        ];

        this.doc.font('Arial').fontSize(12);

        bullets.forEach(b => {
            // Draw bullet point manually or just text
            this.doc.text(reverse(`• ${b}`), { align: 'right' });
            this.doc.moveDown(0.8);
        });
    }
}

module.exports = new NutritionPlanGenerator();
