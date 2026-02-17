const { getLeaderboard } = require('../lib/leveling');
const settings = require('../settings');

async function topCommand(sock, chatId, msg, args) {
    const limit = 10;
    const lb = getLeaderboard(limit);

    let text = `🏆 *Top ${limit} Leaderboard* 🏆\n\n`;

    // Medals
    const medals = ['🥇', '🥈', '🥉'];

    lb.forEach((user, index) => {
        const medal = medals[index] || `${index + 1}.`;
        const name = user.id.split('@')[0]; // Simple name extraction
        text += `${medal} @${name}\n   ⭐ Lvl ${user.level} | 💰 ${user.coins}\n`;
    });

    text += `\n⚔️ ${settings.botName}`;

    // Collect mentions
    const mentions = lb.map(u => u.id);

    await sock.sendMessage(chatId, {
        text: text,
        mentions: mentions
    }, { quoted: msg });
}

module.exports = topCommand;
