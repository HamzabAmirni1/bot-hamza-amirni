const fetch = require("node-fetch");

const goodnightMessages = [
    "تصبح على خير، أحلام سعيدة! 🌙💤",
    "ليلة سعيدة، نعس مزيان! ✨",
    "الله يبيتكم ف راحة الله، تصبحو على خير. 🌃",
    "غمض عينيك وارتاح، ليلة منعشة! 🛌",
    "تصبح على خير يا أحلى واحد ف لكروب. ❤️",
    "ليلة هادئة وأحلام ناضية! 🌌",
    "يلاه باراكا من السهير، تصبح على خير! 😂💤",
    "ليلة سعيدة، نتلاقاو غدا إن شاء الله. 👋✨"
];

async function goodnightCommand(sock, chatId, message) {
    try {
        const randomMsg = goodnightMessages[Math.floor(Math.random() * goodnightMessages.length)];

        await sock.sendMessage(chatId, { text: `🌙 *${randomMsg}*` }, { quoted: message });
    } catch (error) {
        console.error("Error in goodnight command:", error);
        await sock.sendMessage(
            chatId,
            { text: "❌ تصبح على خير! (وقع مشكل ف السيستام ولكن هانية)" },
            { quoted: message }
        );
    }
}

module.exports = goodnightCommand;
