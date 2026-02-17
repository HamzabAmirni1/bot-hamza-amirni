const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function tagCommand(sock, chatId, msg, args) {
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
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const mentionedJidList = participants.map(p => p.id);

        let messageText = args.join(' ') || t('group.tagall_title');
        
        let responseText = `📢 *${messageText}*\n\n`;
        participants.forEach(p => {
            responseText += `• @${p.id.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, {
            text: responseText,
            mentions: mentionedJidList
        }, { quoted: msg });

    } catch (error) {
        console.error('Tag Error:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
}

module.exports = tagCommand;
