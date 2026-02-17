const { t } = require('../lib/language');

async function clearCommand(sock, chatId) {
    try {
        const message = await sock.sendMessage(chatId, { text: t('group.clear_success') });
        const messageKey = message.key; // Get the key of the message the bot just sent

        // Now delete the bot's message
        await sock.sendMessage(chatId, { delete: messageKey });

    } catch (error) {
        console.error('Error clearing messages:', error);
        await sock.sendMessage(chatId, { text: t('group.clear_error') });
    }
}

module.exports = clearCommand;
