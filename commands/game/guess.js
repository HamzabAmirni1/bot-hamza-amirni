const settings = require('../settings');

const sessions = new Map();

async function guessCommand(sock, chatId, msg, args) {
    if (args[0] === 'stop' || args[0] === 'end') {
        if (sessions.has(chatId)) {
            const num = sessions.get(chatId).number;
            sessions.delete(chatId);
            return sock.sendMessage(chatId, { text: `🛑 *اللعبة وقفات.* الرقم كان هو: ${num}` }, { quoted: msg });
        } else {
            return sock.sendMessage(chatId, { text: `⚠️ *ماكاينا حتى لعبة خدامة.*` }, { quoted: msg });
        }
    }

    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);
        const guess = parseInt(args[0]);

        if (isNaN(guess)) return;

        session.attempts++;

        if (guess === session.number) {
            await sock.sendMessage(chatId, { text: `🎉 *مبروك!* جبتيها لاصقة.\nالرقم هو: *${session.number}*\nمحاولات: ${session.attempts}` }, { quoted: msg });
            sessions.delete(chatId);
        } else if (guess < session.number) {
            await sock.sendMessage(chatId, { text: `⬆️ *زيد طلع!* الرقم لي قلتيه صغير.` }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: `⬇️ *هبط شوية!* الرقم لي قلتيه كبير.` }, { quoted: msg });
        }
        return;
    }

    if (sessions.has(chatId)) {
        return sock.sendMessage(chatId, { text: `⚠️ *اللعبة ديجا خدامة!* كمل التخمار ولا دير ${settings.prefix}guess stop باش تحبس.` }, { quoted: msg });
    }

    // Start new game
    const number = Math.floor(Math.random() * 100) + 1; // 1 to 100
    sessions.set(chatId, { number, attempts: 0 });

    const text = `🔮 *لعبة خمن الرقم* 🔮\n\nأنا خبيت واحد الرقم فبالي بين *1* و *100*.\nيلاه وريني حنت يديك وجيبو لاصق! 🧠\n\n👉 طريقة اللعب: دير ${settings.prefix}guess وموراها الرقم (مثال: ${settings.prefix}guess 50)\n\nحظ سعيد! 🍀`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = guessCommand;
