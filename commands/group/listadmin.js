const { getSudoers } = require('../../lib/sudoers');
const { isOwner } = require('../../lib/ownerCheck');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    // Check if user is owner
    if (!isOwner(msg)) {
        return sock.sendMessage(chatId, { text: '❌ هذا الأمر للمالك فقط!' }, { quoted: msg });
    }

    const sudoers = getSudoers();

    if (sudoers.length === 0) {
        return sock.sendMessage(chatId, { text: '📋 لا يوجد مسؤولين (Admins) حالياً.' }, { quoted: msg });
    }

    let list = '👑 *قائمة المشرفين (Admins):*\n\n';
    sudoers.forEach((user, i) => {
        list += `${i + 1}. 👤 *Name:* ${user.name}\n`;
        list += `   📱 *Number:* ${user.id.split('@')[0]}\n`;
        list += `   📅 *Added:* ${new Date(user.addedAt).toLocaleDateString()}\n\n`;
    });

    list += `⚔️ ${global.settings.botName}`;

    await sock.sendMessage(chatId, { text: list }, { quoted: msg });
};
