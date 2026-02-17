const { t } = require('../lib/language');

async function resetlinkCommand(sock, chatId, msg, args, commands, userLang) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    try {
        // Check if sender is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(senderId);

        if (!isAdmin) {
            await sock.sendMessage(chatId, { text: t('group.resetlink_admin', {}, userLang) });
            return;
        }

        // Reset the group link
        const newCode = await sock.groupRevokeInvite(chatId);

        // Send the new link
        await sock.sendMessage(chatId, {
            text: t('group.resetlink_success', { code: newCode }, userLang)
        });

    } catch (error) {
        console.error('Error in resetlink command:', error);
        await sock.sendMessage(chatId, { text: t('group.resetlink_error', {}, userLang) });
    }
}

module.exports = resetlinkCommand;
