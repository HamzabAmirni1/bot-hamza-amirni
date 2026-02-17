const { getUser } = require('../lib/leveling');
const settings = require('../settings');

async function profileCommand(sock, chatId, msg, args) {
    let targetId;

    // Check for mentions
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
        targetId = msg.key.participant || msg.participant;
    }

    const user = getUser(targetId.split('@')[0]); // Assuming lib expects ID without @s.whatsapp.net? 
    // Wait, the lib uses whatever key is passed. Standard is remoteJid or participant ID. 
    // Common ID format is "123456789@s.whatsapp.net".
    // I should pass the full ID to be safe and unique.

    // Re-getting user with full JID for consistency
    const fullId = targetId;
    const userData = getUser(fullId);

    // Calculate progress to next level
    // Formula from lib: level = sqrt(xp / 50) => xp = 50 * level^2
    const currentLevelXp = 50 * (userData.level * userData.level);
    const nextLevelXp = 50 * ((userData.level + 1) * (userData.level + 1));
    const progress = userData.xp - currentLevelXp;
    const needed = nextLevelXp - currentLevelXp;
    const percent = Math.floor((progress / needed) * 100) || 0;

    // Bar
    const filled = Math.floor(percent / 10);
    const bar = "🟦".repeat(filled) + "⬜".repeat(10 - filled);

    const badges = userData.badges.length > 0 ? userData.badges.join(' ') : 'No Badges';

    const text = `
👤 *البروفايل ديالك* 👤

🔖 *اللقب:* ${userData.rankTitle}
📛 *السمية:* @${targetId.split('@')[0]}

⭐ *Level:* ${userData.level}
✨ *XP:* ${userData.xp}
[${bar}] ${percent}%

💰 *Coins:* ${userData.coins} 🪙
🎒 *Badges:* ${badges}

🏆 *Rank:* #${getRank(fullId)}

⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, {
        text: text,
        mentions: [targetId]
    }, { quoted: msg });
}

// Helper to get simple rank position 
function getRank(id) {
    const { getLeaderboard } = require('../lib/leveling');
    const lb = getLeaderboard(1000);
    const index = lb.findIndex(u => u.id === id);
    return index !== -1 ? index + 1 : '1000+';
}

module.exports = profileCommand;
