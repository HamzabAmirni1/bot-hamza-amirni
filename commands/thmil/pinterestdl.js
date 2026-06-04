const settings = require('../../settings');
const { downloadPinterestPin, isPinterestPinUrl, resolvePinterestUrl } = require('../../lib/pinterestApi');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = (args[0] || '').trim();
        if (!url || !isPinterestPinUrl(url)) {
            return await sock.sendMessage(chatId, {
                text: '❌ عطيني رابط Pinterest صحيح!\n\n💡 مثال:\n.pinterestdl https://pin.it/xxxxx\n.pinterestdl https://www.pinterest.com/pin/123.../'
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const result = await downloadPinterestPin(url);
        if (!result?.url) {
            throw new Error('All download methods failed');
        }

        const caption = `✅ *Pinterest Downloader*\n🔗 ${await resolvePinterestUrl(url)}\n\n© ${settings.botName}`;

        if (result.type === 'video') {
            await sock.sendMessage(chatId, {
                video: { url: result.url },
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                image: { url: result.url },
                caption
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error) {
        console.error('Error in pinterestdl command:', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ ما قدرتش نحمل هاد الـ Pin.\n\n💡 تأكد من الرابط وجرب مرة أخرى.'
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
