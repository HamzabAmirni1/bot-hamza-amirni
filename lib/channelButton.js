const { t } = require('./language');
const settings = require('../settings');

/**
 * Sends a message with high reliability.
 * Simple footer-style branding to ensure messages ARE ALWAYS VISIBLE.
 */
async function sendWithChannelButton(sock, chatId, text, quoted = null, content = {}, userLang = null) {
    try {
        // Basic Connection Check
        if (!sock || !sock.sendMessage) {
            console.log('[sendWithChannelButton] Skipping send - socket undefined or invalid');
            return;
        }

        const botName = t('common.botName', {}, userLang);
        const channelLabel = t('common.channel', {}, userLang);
        const footerText = `\n\n📢 *${channelLabel}:* ${settings.officialChannel}\n⚔️ *${botName}*`;

        return await sock.sendMessage(chatId, {
            text: text + footerText,
            contextInfo: {
                mentionedJid: [chatId],
                ...(content.contextInfo || {})
            },
            ...content
        }, { quoted });
    } catch (error) {
        // Suppress "Connection Closed" error logs as they are noise during reconnects
        if (String(error).includes('Connection Closed') || String(error).includes('428')) {
            console.warn('[sendWithChannelButton] Connection dropped during send.');
            return;
        }

        console.error('Error in sendWithChannelButton:', error);
        try {
            if (sock && !sock.isClosed) {
                return await sock.sendMessage(chatId, { text: text }, { quoted });
            }
        } catch (e) { }
    }
}

module.exports = { sendWithChannelButton };
