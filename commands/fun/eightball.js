const settings = require('../settings');

const eightBallResponses = [
    "آه، باينة!",
    "لا، ماكاينش منها!",
    "سولني من بعد، راسي ضارني 🤕",
    "أكيد 100%!",
    "ماظنيتش، شك كبير...",
    "بلا شك، نعم!",
    "الجواب ديالي هو: لا!",
    "كلشي كيشير لـ نعم ✨",
    "غير نسا الموضوع، أحسن ليك 😂",
    "واحد الشوي، يقدر يكون اه",
    "ضروري، مافيهاش الهضرة"
];

async function eightBallCommand(sock, chatId, msg, args) {
    const question = args.join(' ');
    if (!question) {
        await sock.sendMessage(chatId, { text: '❌ عافاك سول شي سؤال! \nمثال: .eightball واش غانولي غني؟' }, { quoted: msg });
        return;
    }

    const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await sock.sendMessage(chatId, { text: `🎱 *الكرة السحرية كتقول ليك:* \n\n${randomResponse}` }, { quoted: msg });
}

module.exports = eightBallCommand;
