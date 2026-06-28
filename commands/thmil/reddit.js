const settings = require('../../settings');
const { downloadReddit } = require('../../lib/socialDownload');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = args[0];
        if (!url || !/reddit\.com/i.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ عطيني رابط Reddit صحيح!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const result = await downloadReddit(url);
        if (!result?.url) throw new Error('No media found');

        const caption = `✅ *Reddit Downloader*\n\n© ${settings.botName}`;

        if (result.type === 'image') {
            await sock.sendMessage(chatId, { image: { url: result.url }, caption }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                video: { url: result.url },
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error) {
        console.error('Error in reddit command:', error.message);
        await sock.sendMessage(chatId, { text: '❌ ما قدرتش نحمل محتوى Reddit.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
