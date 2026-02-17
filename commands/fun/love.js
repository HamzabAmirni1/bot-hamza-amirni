const settings = require('../settings');

async function loveCommand(sock, chatId, msg, args) {
    let target1, target2;

    // Determine targets
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        const mentions = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        if (mentions.length === 2) {
            target1 = mentions[0];
            target2 = mentions[1];
        } else if (mentions.length === 1) {
            target1 = msg.key.participant || msg.participant; // Sender
            target2 = mentions[0];
        }
    } else {
        target1 = msg.key.participant || msg.participant; // Sender
        // Random participant from group would be ideal, but requires fetching metadata.
        // For now, if no mention, tell user to mention someone.
        return sock.sendMessage(chatId, { text: '❌ *عافاك طاقي شي حد باش نحسب الحب بيناتكم!* ❤️' }, { quoted: msg });
    }

    // Clean IDs
    const user1 = target1.split('@')[0];
    const user2 = target2.split('@')[0];

    // Calculate "Love" percentage (Deterministic based on names so it doesn't change randomly for same pair)
    // Just summing char codes for a pseudo-random seed
    const combined = parseInt(user1) + parseInt(user2);
    // Use a date component to make it change daily or stick to static? 
    // Let's make it random but same for the session or just purely random for fun.
    // Pure random is more fun for "trying again".
    const percentage = Math.floor(Math.random() * 101);

    let message = "";
    if (percentage < 25) {
        message = "💔 *العلاقة مكرفسة!* غير نساو الموضوع، السلك مقطوع.";
    } else if (percentage < 50) {
        message = "😐 *يمكن تصدق..* ولكن خاصكم بزاف ديال الصبر والمجهود.";
    } else if (percentage < 75) {
        message = "❤️ *كاين أمل كبير!* علاقة زوينة وغادة فالمزيان.";
    } else if (percentage < 90) {
        message = "😍 *يا سلام!* حب كبير وتفاهم رائع، الله يكمل بالخير.";
    } else {
        message = "💍 *صافي وجدو العرس!* هادشي مكتوب فالسماء، حب أبدي! 🔥";
    }

    // Progress bar visualization
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const bar = "🟥".repeat(filled) + "⬜".repeat(empty);

    const resultText = `
📠 *ماكينة الحب* 📠

👤 *${user1}* ❤️ *${user2}*
📊 *النسبة:* ${percentage}%
[${bar}]

💬 *التحليل:*
${message}

⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: [target1, target2]
    }, { quoted: msg });
}

module.exports = loveCommand;
