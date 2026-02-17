const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function muteCommand(sock, chatId, msg, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const durationInMinutes = parseInt(args[0]) || 60; // Default to 60 minutes if no duration is provided

    console.log(`Attempting to mute the group for ${durationInMinutes} minutes.`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: t('group.bot_admin') }, { quoted: msg });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: t('group.admin_only') }, { quoted: msg });
        return;
    }

    const durationInMilliseconds = durationInMinutes * 60 * 1000;

    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Mute the group
        await sock.sendMessage(chatId, { text: t('group.mute_success', { duration: durationInMinutes }) });

        setTimeout(async () => {
            await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute after the duration
            await sock.sendMessage(chatId, { text: t('group.unmute_success') });
        }, durationInMilliseconds);
    } catch (error) {
        console.error('Error muting/unmuting the group:', error);
        await sock.sendMessage(chatId, { text: t('group.mute_error') });
    }
}

module.exports = muteCommand;
