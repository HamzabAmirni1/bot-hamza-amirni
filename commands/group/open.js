const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function openGroupCommand(sock, chatId, msg, args, commands, userLang) {
    const senderId = msg.key.participant || msg.key.remoteJid;

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: t('group.open_admin_bot') }, { quoted: message });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: t('group.open_admin_user') }, { quoted: message });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'not_announcement'); // Open group
        await sock.sendMessage(chatId, { text: t('group.open_success', {}, userLang) }, { quoted: msg });
    } catch (error) {
        console.error('Error opening group:', error);
        await sock.sendMessage(chatId, { text: t('group.open_error', {}, userLang) }, { quoted: msg });
    }
}

module.exports = openGroupCommand;
