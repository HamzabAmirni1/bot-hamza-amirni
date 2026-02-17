const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { t } = require('../lib/language');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        await sock.sendMessage(chatId, { react: { text: t('dog.react', {}, userLang), key: msg.key } });

        const response = await axios.get('https://dog.ceo/api/breeds/image/random');
        if (response.data && response.data.status === 'success') {
            const dogUrl = response.data.message;
            const caption = t('dog.caption', { botName: t('common.botName', {}, userLang) }, userLang);
            const channelLabel = t('common.channel', {}, userLang);
            const botName = t('common.botName', {}, userLang);

            // Reconstruct footer manually as we are using sock.sendMessage for media
            const footerText = `\n\n📢 *${channelLabel}:* ${settings.officialChannel}\n⚔️ *${botName}*`;

            await sock.sendMessage(chatId, {
                image: { url: dogUrl },
                caption: caption + footerText
            }, { quoted: msg });
        } else {
            throw new Error('No dog found');
        }
    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: t('dog.error', {}, userLang) }, { quoted: msg });
    }
};
