const axios = require('axios');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = args[0];
        if (!url || !/capcut\.com/.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a valid CapCut link!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const response = await axios.get(`https://api.vreden.web.id/api/capcut?url=${encodeURIComponent(url)}`);
        
        if (!response.data || !response.data.status) {
            throw new Error('Failed to fetch from API');
        }

        const result = response.data.result;

        await sock.sendMessage(chatId, {
            video: { url: result.video_url },
            caption: `✅ *CapCut Downloader*\n\n📌 *Title:* ${result.title || 'N/A'}\n👤 *Author:* ${result.author || 'N/A'}\n\n© ${settings.botName}`,
            mimetype: 'video/mp4'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in capcut command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to download CapCut video.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
