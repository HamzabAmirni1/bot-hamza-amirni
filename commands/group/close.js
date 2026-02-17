const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function closeGroupCommand(sock, chatId, msg, args, commands, userLang) {
    const senderId = msg.key.participant || msg.key.remoteJid;

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: t('group.close_admin_bot', {}, userLang) }, { quoted: msg });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: t('group.close_admin_user', {}, userLang) }, { quoted: msg });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Close group
        await sock.sendMessage(chatId, { text: t('group.close_success', {}, userLang) }, { quoted: msg });
    } catch (error) {
        console.error('Error closing group:', error);
        await sock.sendMessage(chatId, { text: t('group.close_error', {}, userLang) }, { quoted: msg });
    }
}

module.exports = closeGroupCommand;
