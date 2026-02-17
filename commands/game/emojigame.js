const settings = require('../settings');

const emojis = [
    { emoji: "🦁👑", answer: "lion king", hint: "فيلم كرتون مشهور" },
    { emoji: "🕷️🕸️", answer: "spiderman", hint: "بطل خارق" },
    { emoji: "🐝🍯", answer: "عسل", hint: "مادة حلوة" },
    { emoji: "🇲🇦⚽🦁", answer: "المنتخب المغربي", hint: "فريق وطني" },
    { emoji: "🚢🧊💔", answer: "titanic", hint: "فيلم رومانسي حزين" },
    { emoji: "🍎📱", answer: "iphone", hint: "تليفون مشهور" },
    { emoji: "🦇👨‍⚖️", answer: "batman", hint: "بطل ظلام" },
    { emoji: "⚡👓🧹", answer: "harry potter", hint: "ساحر صغير" },
    { emoji: "🐼👊", answer: "kung fu panda", hint: "دب مقاتل" },
    { emoji: "💍🌋🦵", answer: "lord of the rings", hint: "خاتم وسحر" },
    { emoji: "🏴‍☠️👒🍖", answer: "one piece", hint: "أنمي قراصنة" },
    { emoji: "🐉🔮👊", answer: "dragon ball", hint: "أنمي قتال" },
    { emoji: "👻🚫🔫", answer: "ghostbusters", hint: "صيادو الأشباح" },
    { emoji: "🦖🦕🚙", answer: "jurassic park", hint: "ديناصورات" },
    { emoji: "🤡🎈😱", answer: "it", hint: "فيلم رعب" }
];

const sessions = new Map();

async function emojiGameCommand(sock, chatId, msg, args) {
    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);
        const guess = args.join(' ').toLowerCase();

        // Check exact or partial match
        if (guess === session.answer || guess.includes(session.answer)) {
            await sock.sendMessage(chatId, { text: `✅ *برافو!* الجواب صحيح: ${session.answer} 🎉` }, { quoted: msg });
            sessions.delete(chatId);
        } else if (guess === 'hint') {
            await sock.sendMessage(chatId, { text: `💡 *تلميح:* ${session.hint}` }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: `❌ *غلط!* حاول مرة أخرى.` }, { quoted: msg });
        }
        return;
    }

    // Start New Game
    const q = emojis[Math.floor(Math.random() * emojis.length)];
    sessions.set(chatId, { answer: q.answer, hint: q.hint });

    const text = `🧩 *خمن الإيموجي* 🧩\n\nشنو المعنى ديال هاد الرموز؟\n👉 ${q.emoji}\n\nكتب الجواب ديريكت.\n💡 للمساعدة كتب: hint\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = emojiGameCommand;
