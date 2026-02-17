const { t } = require('../lib/language');

const isAdmin = require('../lib/isAdmin');

async function unmuteCommand(sock, chatId, msg, args, commands, userLang) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return await sock.sendMessage(chatId, { text: t('group.bot_admin', {}, userLang) }, { quoted: msg });
    }
    if (!isSenderAdmin) {
        return await sock.sendMessage(chatId, { text: t('group.admin_only', {}, userLang) }, { quoted: msg });
    }

    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
    await sock.sendMessage(chatId, { text: t('group.unmute_success', {}, userLang) }, { quoted: msg });
}

module.exports = unmuteCommand;
