const pdfGenerator = require('../src/services/pdfGenerator');
const path = require('path');

const mockData = {
    clientName: "ישראל ישראלי",
    calories: "1800",
    meals: {
        breakfast: "2 פרוסות לחם מלא + חביתה מ-2 ביצים + סלט ירקות",
        lunch: "חזה עוף 200 גרם + אורז בסמטי 150 גרם (אחרי בישול) + שעועית ירוקה",
        dinner: "גביע קוטג' 5% + טונה במים + 2 פריכיות אורז",
        snack: "תפוח עץ בינוני + 10 שקדים"
    }
};

async function run() {
    console.log("Generating PDF...");
    try {
        const outputPath = path.join(__dirname, '../test_menu.pdf');
        await pdfGenerator.generate(mockData, outputPath);
        console.log("PDF generated successfully at:", outputPath);
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
}

run();
