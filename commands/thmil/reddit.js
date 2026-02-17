const axios = require('axios');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = args[0];
        if (!url || !/reddit\.com/.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a valid Reddit link!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const response = await axios.get(`https://api.vreden.web.id/api/reddit?url=${encodeURIComponent(url)}`);
        
        if (!response.data || !response.data.status) {
            throw new Error('Failed to fetch from API');
        }

        const result = response.data.result;

        await sock.sendMessage(chatId, {
            video: { url: result.video_url || result.url },
            caption: `✅ *Reddit Downloader*\n\n© ${settings.botName}`,
            mimetype: 'video/mp4'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in reddit command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to download Reddit content.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
