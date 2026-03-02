const WaterBot = require('../../lib/waterBot');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');
const { t } = require('../../lib/language');

async function waterbotCommand(sock, chatId, msg, args) {
    const text = args.join(' ').trim();

    if (!text) {
        const helpMsg = t('waterbot.help', { prefix: settings.prefix }) + `\n\n⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "💬", key: msg.key } });

        const api = new WaterBot();
        const { result } = await api.chat({ prompt: text });

        if (!result) {
            throw new Error(t('waterbot.error_no_response'));
        }

        const responseMsg = `${t('waterbot.response_title')}\n\n${result}\n\n⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: responseMsg }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Error in WaterBot command:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sendWithChannelButton(sock, chatId, t('waterbot.error_generic', { error: error.message || 'Unknown error' }), msg);
    }
}

module.exports = waterbotCommand;
