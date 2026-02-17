const settings = require('../settings');

// List of scrambled words (Moroccan/Arabic context)
const words = [
    { original: "المغرب", scrambled: "ب ر غ ل م ا" },
    { original: "طنجية", scrambled: "ة ي ج ن ط" },
    { original: "كسكس", scrambled: "س ك س ك" },
    { original: "اتاي", scrambled: "ي ا ت ا" },
    { original: "بيسي", scrambled: "ي س ي ب" },
    { original: "انترنت", scrambled: "ت ن ر ت ن ا" },
    { original: "مدرسة", scrambled: "ة س ر د م" },
    { original: "تلفزة", scrambled: "ة ز ف ل ت" },
    { original: "طوموبيل", scrambled: "ل ي ب و م و ط" },
    { original: "بحر", scrambled: "ر ح ب" },
    { original: "شمش", scrambled: "ش م ش" },
    { original: "نعناع", scrambled: "ع ا ن ع ن" },
    { original: "خبز", scrambled: "ز ب خ" },
    { original: "سروال", scrambled: "ل ا و ر س" },
    { original: "سباط", scrambled: "ط ا ب س" },
    { original: "درب", scrambled: "ب ر د" },
    { original: "حومة", scrambled: "ة م و ح" },
    { original: "فرماج", scrambled: "ج ا م ر ف" },
    { original: "حليب", scrambled: "ب ي ل ح" },
    { original: "قهوة", scrambled: "ة و ه ق" }
];

const sessions = new Map();

async function scrambleCommand(sock, chatId, msg, args) {
    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);
        const guess = args.join('');

        if (guess === session.original) {
            await sock.sendMessage(chatId, { text: `✅ *برافو!* الكلمة صحيحة: ${session.original} 🎉` }, { quoted: msg });
            sessions.delete(chatId);
        } else {
            await sock.sendMessage(chatId, { text: `❌ *غلط!* حاول مرة أخرى.` }, { quoted: msg });
        }
        return;
    }

    // Start new game
    const wordObj = words[Math.floor(Math.random() * words.length)];
    sessions.set(chatId, { original: wordObj.original });

    const text = `🔠 *رتب الكلمة* 🔠\n\nحاول تقاد هاد الحروف باش تلقى الكلمة المخبية:\n\n👉 *${wordObj.scrambled}*\n\nكتب الجواب باستعمال: ${settings.prefix}scramble [الكلمة]\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = scrambleCommand;
