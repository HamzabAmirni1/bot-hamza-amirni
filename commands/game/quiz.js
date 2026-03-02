const settings = require('../../settings');

const quizQuestions = [
    { question: "شنو هي عاصمة المغرب؟", answer: "الرباط", options: ["الدار البيضاء", "الرباط", "مراكش", "فاس"] },
    { question: "شكون هو بطل كأس العالم 2022؟", answer: "الارجنتين", options: ["فرنسا", "البرازيل", "الارجنتين", "المغرب"] },
    { question: "شحال عدد ركعات صلاة المغرب؟", answer: "3", options: ["2", "3", "4", "5"] },
    { question: "شنو سميت العملة ديال اليابان؟", answer: "ين", options: ["دولار", "يورو", "ين", "وان"] },
    { question: "شكون هو مخترع المصباح الكهربائي؟", answer: "توماس اديسون", options: ["نيوتن", "اينشتاين", "توماس اديسون", "غاليليو"] },
    { question: "شنو هي أكبر دولة فالعالم من حيث المساحة؟", answer: "روسيا", options: ["الصين", "امريكا", "روسيا", "كندا"] },
    { question: "شحال عدد ألوان قوس قزح؟", answer: "7", options: ["5", "6", "7", "8"] },
    { question: "شنو هو أسرع حيوان بري؟", answer: "الفهد", options: ["الاسد", "الفهد", "الحصان", "النمر"] },
    { question: "فاش من قارة كاينة مصر؟", answer: "افريقيا", options: ["اسيا", "افريقيا", "اوروبا", "امريكا"] },
    { question: "شنو هو الحيوان لي معروف بلقب 'سفينة الصحراء'؟", answer: "الجمل", options: ["الحصان", "الجمل", "الفيل", "النعامة"] },
    { question: "شكون هو أول إنسان طلع للقمر؟", answer: "نيل ارمسترونغ", options: ["يوري غاغارين", "نيل ارمسترونغ", "باز ألدرين", "مايكل كولينز"] },
    { question: "شنو هو المعدن لي أغلى من الذهب؟", answer: "الماس", options: ["الفضة", "الماس", "النحاس", "الحديد"] },
    { question: "شحال كاين من ثانية فالدقيقة؟", answer: "60", options: ["50", "60", "30", "100"] },
    { question: "شنو هي عاصمة فرنسا؟", answer: "باريس", options: ["لندن", "مدريد", "باريس", "روما"] },
    { question: "شنو اللون لي كيجي من خلط الأزرق والأصفر؟", answer: "الاخضر", options: ["الحمر", "الاخضر", "البرتقالي", "البنفسجي"] },
    { question: "شكون هو مدرب المنتخب المغربي (مول النية)؟", answer: "وليد الركراكي", options: ["خليلوزيتش", "وليد الركراكي", "هيرفي رونار", "زاكي"] },
    { question: "شنو هي أطول آية فالقرآن الكريم؟", answer: "اية الدين", options: ["اية الكرسي", "اية الدين", "اية النور", "اية الملك"] },
    { question: "شحال عدد جهات المملكة المغربية؟", answer: "12", options: ["10", "12", "16", "9"] },
    { question: "شنو هو أكبر كوكب فالمجموعة الشمسية؟", answer: "المشتري", options: ["الارض", "المشتري", "زحل", "المريخ"] },
    { question: "شكون اللي رسم لوحة الموناليزا؟", answer: "ليوناردو دافينشي", options: ["بيكاسو", "فان جوخ", "ليوناردو دافينشي", "مايكل أنجلو"] },
    { question: "شنو هي العملة ديال السعودية؟", answer: "الريال", options: ["الدرهم", "الدينار", "الريال", "الليرة"] },
    { question: "شكون هو أول الخلفاء الراشدين؟", answer: "ابو بكر الصديق", options: ["عمر بن الخطاب", "علي بن ابي طالب", "عثمان بن عفان", "ابو بكر الصديق"] },
    { question: "شنو هو أسرع شيء فالكون؟", answer: "الضوء", options: ["الصوت", "الضوء", "الصاروخ", "البرق"] },
    { question: "شحال عدد أسنان الإنسان البالغ؟", answer: "32", options: ["28", "30", "32", "34"] },
    { question: "شنو هي عاصمة إيطاليا؟", answer: "روما", options: ["ميلان", "روما", "نابولي", "البندقية"] },
    { question: "شكون هو مكتشف الجاذبية؟", answer: "نيوتن", options: ["اينشتاين", "نيوتن", "تسلا", "اديسون"] },
    { question: "شنو هو الحيوان اللي ما كينعسش؟", answer: "سمك القرش", options: ["الفيل", "سمك القرش", "الدلفين", "الاسد"] },
    { question: "شنو هو أكبر محيط فالعالم؟", answer: "المحيط الهادي", options: ["المحيط الاطلسي", "المحيط الهندي", "المحيط الهادي", "المحيط المتجمد"] },
    { question: "شكون هو مؤلف سلسلة هاري بوتر؟", answer: "ج.ك. رولينغ", options: ["تولكين", "ج.ك. رولينغ", "ستيفن كينغ", "جورج مارتن"] },
    { question: "شنو هي المدينة الحمراء فالمغرب؟", answer: "مراكش", options: ["فاس", "مكناس", "مراكش", "الرباط"] },
    { question: "شحال عدد أيام السنة الكبيسة؟", answer: "366", options: ["365", "364", "366", "360"] },
    { question: "شنو هو العنصر الكيميائي اللي الرمز ديالو O؟", answer: "الأكسجين", options: ["الذهب", "الفضة", "الأكسجين", "الحديد"] },
    { question: "شكون هو ملك الغابة؟", answer: "الاسد", options: ["النمبر", "الاسد", "الفيل", "الذئب"] },
    { question: "شنو هي عاصمة مصر؟", answer: "القاهرة", options: ["الاسكندرية", "القاهرة", "الجيزة", "الاقصر"] },
    { question: "شنو هو أطول نهر فالعالم؟", answer: "النيل", options: ["الامازون", "النيل", "الفرات", "الدانوب"] },
    { question: "شحال عدد لاعبي فريق كرة القدم داخل الملعب؟", answer: "11", options: ["10", "11", "9", "12"] },
    { question: "شنو هو لون الصندوق الأسود فالطيارة؟", answer: "برتقالي", options: ["اسود", "احمر", "اصفر", "برتقالي"] },
    { question: "شكون هو النبي اللي ابتلعو الحوت؟", answer: "يونس", options: ["موسى", "يونس", "يوسف", "عيسى"] },
    { question: "شنو هي الدولة اللي عندها أكبر عدد ديال السكان؟", answer: "الهند", options: ["الصين", "الهند", "امريكا", "روسيا"] }, // الهند تجاوزت الصين مؤخرا
    { question: "شنو هو الطائر اللي كيولد وما كيبيضش؟", answer: "الخفاش", options: ["النعامة", "الخفاش", "البطريق", "النسر"] },
    { question: "شحال عدد سور القرآن الكريم؟", answer: "114", options: ["110", "114", "120", "100"] },
    { question: "شنو هو المعدن السائل؟", answer: "الزئبق", options: ["الحديد", "الزئبق", "الذهب", "النحاس"] },
    { question: "شكون هو مؤسس شركة مايكروسوفت؟", answer: "بيل غيتس", options: ["ستيف جوبز", "بيل غيتس", "إيلون ماسك", "مارك زوكربيرغ"] },
    { question: "شنو هي عاصمة إسبانيا؟", answer: "مدريد", options: ["برشلونة", "مدريد", "اشبيلية", "فالنسيا"] },
    { question: "شنو هو الحيوان اللي كيشم بلسانو؟", answer: "التعيبان", options: ["الكلب", "القط", "التعيبان", "الضفدع"] },
    { question: "فاش من عام استاقل المغرب؟", answer: "1956", options: ["1944", "1956", "1966", "1953"] },
    { question: "شنو هو أعلى جبل فالمغرب؟", answer: "توبقال", options: ["ايوا", "توبقال", "العياشي", "مكون"] },
    { question: "شنو هي العملة الرقمية الأشهر؟", answer: "البيتكوين", options: ["الايثيريوم", "البيتكوين", "الريبل", "الدوجكوين"] },
    { question: "شكون هو الهداف التاريخي لكأس العالم؟", answer: "كلوزه", options: ["رونالدو", "ميسي", "كلوزه", "بيليه"] },
    { question: "شنو هو الكوكب الأحمر؟", answer: "المريخ", options: ["المشتري", "المريخ", "زحل", "الزهرة"] },
    { question: "شحال عدد قلوب الأخطبوط؟", answer: "3", options: ["1", "2", "3", "4"] },
    { question: "أين يوجد تمثال الحرية؟", answer: "نيويورك", options: ["واشنطن", "نيويورك", "باريس", "لندن"] },
    { question: "شنو هي لغة البرمجة اللي كنخدمو بيها دابا؟", answer: "جافاسكريبت", options: ["بايثون", "جافا", "جافاسكريبت", "سي بلس بلس"] },
    { question: "شكون هو مخترع الهاتف؟", answer: "غراهام بيل", options: ["اديسون", "تسلا", "غراهام بيل", "ماركوني"] }
];

// Map to store active quiz sessions per chat
const activeQuizzes = new Map();

// Helper to normalize text for better matching
function normalizeText(text) {
    if (!text) return "";
    return text.trim().toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u0652]/g, "") // Remove Tashkeel
        .replace(/\s+/g, " ");
}

async function quizCommand(sock, chatId, msg, args) {
    // If user answers
    if (activeQuizzes.has(chatId) && args.length > 0) {
        const session = activeQuizzes.get(chatId);
        const userInput = args.join(' ').trim();
        const normalizedInput = normalizeText(userInput);
        const normalizedAnswer = normalizeText(session.answer);

        // 1. Check if user input is the option number
        const optNumber = parseInt(userInput);
        const isOptionNumberMatched = !isNaN(optNumber) && session.options[optNumber - 1] === session.answer;

        // 2. Check for exact or normalized match
        const isTextMatched = normalizedInput === normalizedAnswer ||
            (normalizedInput.length > 2 && normalizedAnswer.includes(normalizedInput)) ||
            (normalizedAnswer.length > 2 && normalizedInput.includes(normalizedAnswer));

        if (isOptionNumberMatched || isTextMatched) {
            await sock.sendMessage(chatId, { text: `✅ *برافو عليك!* الجواب صحيح: ${session.answer} 🎉` }, { quoted: msg });
            activeQuizzes.delete(chatId);
            return;
        } else {
            // Check if it's a number but wrong option
            if (!isNaN(optNumber) && optNumber > 0 && optNumber <= session.options.length) {
                await sock.sendMessage(chatId, { text: `❌ *جواب غلط!* حاول مرة أخرى.` }, { quoted: msg });
                return;
            }
        }
    }

    // Start new quiz
    const q = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];

    // Store session
    activeQuizzes.set(chatId, q);

    let optionsText = "";
    q.options.forEach((opt, index) => {
        optionsText += `${index + 1}. ${opt}\n`;
    });

    const text = `🧠 *لعبة مسابقة المعرفة* 🧠\n\n❓ *السؤال:* ${q.question}\n\n👇 *الخيارات:*\n${optionsText}\n\n💡 *للمشاركة:* اكتب الجواب الصحيح فالشات.\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = quizCommand;
