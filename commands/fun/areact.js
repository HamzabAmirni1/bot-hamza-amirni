const { handleAreactCommand } = require('../lib/reactions');
const settings = require('../settings');

async function areactCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    // Check if sender is owner (either fromMe or match ownerNumber)
    const isOwner = message.key.fromMe || (senderId && senderId.includes(settings.ownerNumber));

    await handleAreactCommand(sock, chatId, message, isOwner);
}

module.exports = areactCommand;
