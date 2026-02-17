const { t } = require('../lib/language');
const isAdmin = require('../lib/isAdmin');

/**
 * Standard Hidetag Command
 * Tags all group members without seeing their names in the message
 */
async function hidetagCommand(sock, chatId, msg, args) {
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

        if (!participants || participants.length === 0) return;

        const mentionedJids = participants.map(p => p.id);
        const messageText = args.join(' ') || '';

        // If it's a reply, tag the replied message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted) {
            await sock.sendMessage(chatId, {
                forward: {
                    key: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant,
                    message: quoted
                },
                mentions: mentionedJids
            });
        } else {
            await sock.sendMessage(chatId, {
                text: messageText,
                mentions: mentionedJids
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in hidetag command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
}

module.exports = hidetagCommand;
