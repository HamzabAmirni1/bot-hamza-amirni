const settings = require('../../settings');
const { downloadSnapchat } = require('../../lib/socialDownload');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = args[0];
        if (!url || !/snapchat\.com/i.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ عطيني رابط Snapchat صحيح!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const result = await downloadSnapchat(url);
        if (!result?.url) throw new Error('No media found');

        if (result.type === 'image') {
            await sock.sendMessage(chatId, {
                image: { url: result.url },
                caption: `✅ *Snapchat Downloader*\n\n© ${settings.botName}`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                video: { url: result.url },
                caption: `✅ *Snapchat Downloader*\n\n© ${settings.botName}`,
                mimetype: 'video/mp4'
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error) {
        console.error('Error in snapchat command:', error.message);
        await sock.sendMessage(chatId, { text: '❌ ما قدرتش نحمل هاد الفيديو.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
