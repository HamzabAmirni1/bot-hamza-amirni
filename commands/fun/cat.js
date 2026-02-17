const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { t } = require('../lib/language');

module.exports = async (sock, chatId, msg, args) => {
    try {
        await sock.sendMessage(chatId, { react: { text: t('cat.react'), key: msg.key } });

        const response = await axios.get('https://api.thecatapi.com/v1/images/search');
        if (response.data && response.data.length > 0) {
            const catUrl = response.data[0].url;
            const caption = t('cat.caption', { botName: settings.botName });
            const footerText = `\n\n📢 *Channel:* ${settings.officialChannel}\n⚔️ *${settings.botName}*`;

            await sock.sendMessage(chatId, {
                image: { url: catUrl },
                caption: caption + footerText
            }, { quoted: msg });
        } else {
            throw new Error('No cat found');
        }
    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: t('cat.error') }, { quoted: msg });
    }
};
