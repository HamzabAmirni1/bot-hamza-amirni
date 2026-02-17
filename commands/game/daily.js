const { claimDaily } = require('../lib/leveling');
const settings = require('../settings');

// Helper to format duration
function msToTime(duration) {
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
}

async function dailyCommand(sock, chatId, msg, args) {
    const userId = msg.key.participant || msg.participant;
    const result = claimDaily(userId);

    if (result.success) {
        await sock.sendMessage(chatId, {
            text: `💰 *بصحة!* خديتي المكافأة اليومية ديالك.\n\n➕ *${result.reward} Coins* 🪙\n\nرجع غدا باش تاخد المزيد!`
        }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, {
            text: `⏳ *بلاتي شوية!* راك ديجا خديتي المكافأة اليوم.\n\nرجع من بعد: *${msToTime(result.timeLeft)}*`
        }, { quoted: msg });
    }
}

module.exports = dailyCommand;
