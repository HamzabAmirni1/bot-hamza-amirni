const settings = require('../settings');

async function rateCommand(sock, chatId, msg, args) {
    let targetId;

    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
        targetId = msg.key.participant || msg.participant;
    }

    const topics = [
        "الزين (Beauty)",
        "الذكاء (Intelligence)",
        "الزهر (Luck)",
        "الضسارة (Naughtiness)",
        "الرجولة (Manliness)",
        "الهبال (Craziness)",
        "الكدوب (Lying)",
        "النية (Innocence)"
    ];

    // User can optionally specify topic: .rate beauty
    let topic = topics[Math.floor(Math.random() * topics.length)];
    const requested = args[0]?.toLowerCase();

    if (requested) {
        if (requested.includes('zin') || requested.includes('beauty')) topic = "الزين (Beauty)";
        if (requested.includes('dka') || requested.includes('smart')) topic = "الذكاء (Intelligence)";
        // Add more manual mappings if needed
    }

    const rating = Math.floor(Math.random() * 101); // 0 to 100

    let comment = "";
    if (rating < 20) comment = "😱 هادشي ضعيف بزاف!";
    else if (rating < 50) comment = "😐 لاباس، متوسط.";
    else if (rating < 80) comment = "🔥 ناضي، تبارك الله!";
    else comment = "💎 يا سلام! القمة.";

    const text = `
📊 *Rate Me* 📊

👤 *الشخص:* @${targetId.split('@')[0]}
🏷️ *المعيار:* ${topic}
📈 *النتيجة:* ${rating}%

💬 ${comment}

⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, {
        text: text,
        mentions: [targetId]
    }, { quoted: msg });
}

module.exports = rateCommand;
