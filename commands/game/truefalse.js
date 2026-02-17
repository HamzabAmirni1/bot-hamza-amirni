const settings = require('../settings');

const questions = [
    { q: "واش الرباط هي عاصمة المغرب؟", a: true },
    { q: "واش الشمس كتدور حول الأرض؟", a: false },
    { q: "واش الفيل كيطير؟", a: false },
    { q: "واش الماء كيتكون من هيدروجين وأكسجين؟", a: true },
    { q: "واش رونالدو لعب مع الرجاء؟", a: false },
    { q: "واش المغرب ربح البرازيل ف 2023؟", a: true },
    { q: "واش الحوت كينعس وعينيه محلولين؟", a: true },
    { q: "واش الطيارة أسرع من الصوت؟", a: true },
    { q: "واش الانسان عندو 3 ديول الكلاوي؟", a: false },
    { q: "واش البطريق كيعيش فالصحراء؟", a: false },
    { q: "واش الأخطبوط عندو 3 دالقلوب؟", a: true },
    { q: "واش مراكش فيها البحر؟", a: false },
    { q: "واش البيتكوين عملة رقمية؟", a: true },
    { q: "واش توم كروز ممثل مغربي؟", a: false },
    { q: "واش أتاي هو المشروب الوطني فالمغرب؟", a: true }
];

// Active sessions
const sessions = new Map();

async function trueFalseCommand(sock, chatId, msg, args) {
    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);
        const input = args[0].toLowerCase();

        // Map inputs
        let answer = null;
        if (['true', 't', 'صحيح', 'صح', 'ص', 'oui', 'yes', 'ah'].includes(input)) answer = true;
        if (['false', 'f', 'خطأ', 'خ', 'no', 'la', 'non'].includes(input)) answer = false;

        if (answer === null) return; // Ignore invalid input

        if (answer === session.answer) {
            await sock.sendMessage(chatId, { text: `✅ *برافو!* جواب صحيح. 🎉` }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: `❌ *غلط!* الجواب كان: ${session.answer ? 'صحيح' : 'خطأ'}` }, { quoted: msg });
        }
        sessions.delete(chatId);
        return;
    }

    // New Question
    const q = questions[Math.floor(Math.random() * questions.length)];
    sessions.set(chatId, { answer: q.a });

    const text = `🤔 *صح أم خطأ؟* 🤔\n\nالسؤال: *${q.q}*\n\nجاوب بـ: *صح* أو *خطأ*\n(أو true / false)\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = trueFalseCommand;
