const { t } = require('../lib/language');
const isAdmin = require('../lib/isAdmin');

async function tagAllCommand(sock, chatId, msg, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;

    // Check if it's a group
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: t('group.group_only') }, { quoted: msg });
        return;
    }

    // Check admin status
    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { text: t('group.admin_only') }, { quoted: msg });
        return;
    }

    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            return;
        }

        // Create message with each member on a new line
        let messageText = `${t('group.tagall_title')}\n\n`;
        participants.forEach(participant => {
            messageText += `@${participant.id.split('@')[0]}\n`;
        });

        // Send message with mentions
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: t('group.tagall_error') }, { quoted: msg });
    }
}

module.exports = tagAllCommand;
