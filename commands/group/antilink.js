const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');
const { isAdmin } = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function handleAntilinkCommand(sock, chatId, msg, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;

    // Check if sender is owner or group admin
    const ownerStatus = isOwner(msg);
    if (!ownerStatus) {
        const adminStatus = await isAdmin(sock, chatId, senderId);
        if (!adminStatus.isSenderAdmin) {
            return await sock.sendMessage(chatId, { text: t('moderation.antilink_admin') }, { quoted: msg });
        }
    }

    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: t('moderation.antilink_group_only') }, { quoted: msg });
    }

    const subCommand = (args[0] || '').toLowerCase();

    if (subCommand === 'on') {
        const action = (args[1] || 'delete').toLowerCase();
        if (!['delete', 'kick', 'warn'].includes(action)) {
            return await sock.sendMessage(chatId, { text: t('moderation.antilink_usage') }, { quoted: msg });
        }
        await setAntilink(chatId, 'on', action);
        await sock.sendMessage(chatId, {
            text: t('moderation.antilink_success_title') + "\n" + t('moderation.antilink_success_desc', { action })
        }, { quoted: msg });
    } else if (subCommand === 'off') {
        await removeAntilink(chatId);
        await sock.sendMessage(chatId, { text: t('moderation.antilink_off') }, { quoted: msg });
    } else {
        const config = await getAntilink(chatId, 'on');
        const status = config ? `${t('reactions.on')} (${config.action})` : t('reactions.off');

        const helpMsg = t('moderation.antilink_status_title') + "\n\n" + t('moderation.antilink_status_body', { status });

        await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
    }
}

module.exports = handleAntilinkCommand;
