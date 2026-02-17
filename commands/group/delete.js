const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

async function deleteCommand(sock, chatId, message, senderId) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: t('group.delete_error') });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: t('group.admin_only') });
        return;
    }

    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;

    if (quotedMessage) {
        await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: quotedMessage, participant: quotedParticipant } });
    } else {
        await sock.sendMessage(chatId, { text: t('group.delete_usage') });
    }
}

module.exports = deleteCommand;
