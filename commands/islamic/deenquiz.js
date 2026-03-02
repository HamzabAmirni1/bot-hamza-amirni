const settings = require('../../settings');
const { sendWithChannelButton } = require('../../lib/channelButton');

const deenQuestions = [
    { question: "من هو الصحابي الذي لُقب بـ 'سيف الله المسلول'؟", answer: "خالد بن الوليد", options: ["خالد بن الوليد", "عمر بن الخطاب", "حمزة بن عبد المطلب", "علي بن أبي طالب"] },
    { question: "ما هي أطول سورة في القرآن الكريم؟", answer: "البقرة", options: ["ال عمران", "النساء", "البقرة", "المائدة"] },
    { question: "كم عدد ركعات صلاة الفجر؟", answer: "2", options: ["2", "3", "4", "1"] },
    { question: "من هو أول من أذن في الإسلام؟", answer: "بلال بن رباح", options: ["أبو بكر الصديق", "بلال بن رباح", "عمار بن ياسر", "علي بن أبي طالب"] },
    { question: "كم عدد أركان الإسلام؟", answer: "5", options: ["4", "5", "6", "7"] },
    { question: "ما هي السورة التي تسمى 'عروس القرآن'؟", answer: "الرحمن", options: ["يس", "الرحمن", "الملك", "الواقعة"] },
    { question: "من هو النبي الذي ابتلعه الحوت؟", answer: "يونس", options: ["يوسف", "يونس", "موسى", "عيسى"] },
    { question: "في أي شهر نزل القرآن الكريم؟", answer: "رمضان", options: ["رجب", "شعبان", "رمضان", "شوال"] },
    { question: "كم عدد أركان الإيمان؟", answer: "6", options: ["5", "6", "7", "4"] },
    { question: "ما هي السورة التي تعدل ثلث القرآن؟", answer: "الإخلاص", options: ["الفاتحة", "الإخلاص", "الكرسي", "يس"] },
    { question: "من هو الصحابي الملقب بـ 'ذي النورين'؟", answer: "عثمان بن عفان", options: ["عمر بن الخطاب", "عثمان بن عفان", "أبو بكر الصديق", "علي بن أبي طالب"] },
    { question: "ما هو اسم السورة التي تبدأ بـ 'تبارك الذي بيده الملك'؟", answer: "الملك", options: ["الملك", "تبارك", "الواقعة", "الفرقان"] },
    { question: "ما هي أقصر سورة في القرآن الكريم؟", answer: "الكوثر", options: ["الإخلاص", "العصر", "الكوثر", "الماعون"] },
    { question: "من هي أم البشر؟", answer: "حواء", options: ["مريم", "آسيا", "حواء", "خديجة"] },
    { question: "كم عدد ركعات صلاة الظهر؟", answer: "4", options: ["2", "3", "4", "5"] },
    { question: "أين ولد النبي محمد ﷺ؟", answer: "مكة", options: ["مكة", "المدينة", "الطائف", "جدة"] },
    { question: "ما هو اسم الغار الذي كان يتعبد فيه النبي ﷺ؟", answer: "حراء", options: ["حراء", "ثور", "أحد", "سيناء"] },
    { question: "من هو أول من آمن من الرجال؟", answer: "أبو بكر الصديق", options: ["عمر بن الخطاب", "علي بن أبي طالب", "أبو بكر الصديق", "عثمان بن عفان"] },
    { question: "ما هي القبلة الأولى للمسلمين؟", answer: "المسجد الأقصى", options: ["المسجد الحرام", "المسجد النبوي", "المسجد الأقصى", "مسجد قباء"] },
    { question: "كم عدد أبناء النبي محمد ﷺ؟", answer: "7", options: ["3", "5", "7", "6"] },
    { question: "ما هي السورة التي لا بد من قراءتها في كل ركعة؟", answer: "الفاتحة", options: ["الإخلاص", "الفاتحة", "الكوثر", "آية الكرسي"] },
    { question: "من هو النبي الملقب بـ 'كليم الله'؟", answer: "موسى", options: ["عيسى", "إبراهيم", "موسى", "داوود"] },
    { question: "ما هو اسم الملك الموكل بالوحي؟", answer: "جبريل", options: ["ميكائيل", "إسرافيل", "جبريل", "عزرائيل"] },
    { question: "في أي سنة هجرية كانت غزوة بدر الكبرى؟", answer: "2", options: ["1", "2", "3", "5"] },
    { question: "كم عدد أجزاء القرآن الكريم؟", answer: "30", options: ["20", "30", "40", "60"] }
];

const activeDeenQuizzes = new Map();

// Helper to normalize Arabic text for better matching
function normalizeText(text) {
    if (!text) return "";
    return text.trim().toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u0652]/g, "") // Remove Tashkeel
        .replace(/\s+/g, " ");
}

async function deenQuizCommand(sock, chatId, msg, args) {
    if (activeDeenQuizzes.has(chatId) && args.length > 0) {
        const session = activeDeenQuizzes.get(chatId);
        const userInput = args.join(' ').trim();
        const normalizedInput = normalizeText(userInput);
        const normalizedAnswer = normalizeText(session.answer);

        // 1. Check if user input is the option number (1, 2, 3, 4)
        const optNumber = parseInt(userInput);
        const isOptionNumberMatched = !isNaN(optNumber) && session.options[optNumber - 1] === session.answer;

        // 2. Check for exact or normalized match
        const isTextMatched = normalizedInput === normalizedAnswer ||
            (normalizedInput.length > 2 && normalizedAnswer.includes(normalizedInput)) ||
            (normalizedAnswer.length > 2 && normalizedInput.includes(normalizedAnswer));

        if (isOptionNumberMatched || isTextMatched) {
            await sock.sendMessage(chatId, { text: `✅ *إجابة صحيحة!* \n\n🎯 الجواب هو: *${session.answer}*\n🎉 هنيئاً لك زدتِ ميزان علمك.` }, { quoted: msg });
            activeDeenQuizzes.delete(chatId);
            return;
        } else {
            // Check if it's a number but wrong option
            if (!isNaN(optNumber) && optNumber > 0 && optNumber <= session.options.length) {
                await sock.sendMessage(chatId, { text: `❌ *إجابة خاطئة!* حاول مريقة أخرى.` }, { quoted: msg });
                return;
            }
            // For other text, we ignore to avoid spamming the group with "wrong" messages unless it's clearly a quiz attempt
        }
    } else {
        const q = deenQuestions[Math.floor(Math.random() * deenQuestions.length)];
        activeDeenQuizzes.set(chatId, q);

        let optionsText = "";
        q.options.forEach((opt, index) => {
            optionsText += `${index + 1}️⃣ ${opt}\n`;
        });

        const text = `🕌 *مسابقة المعلومات الدينية* 🕌\n\n` +
            `❓ *السؤال:* ${q.question}\n\n` +
            `👇 *الاختيارات:*\n${optionsText}\n` +
            `💡 *للمشاركة:* اكتب رقم الإجابة أو الإجابة نفسها في الشات.\n\n` +
            `⚔️ ${settings.botName}`;

        await sendWithChannelButton(sock, chatId, text, msg);
    }
}

module.exports = deenQuizCommand;
