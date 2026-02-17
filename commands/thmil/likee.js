const axios = require('axios');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args) => {
    try {
        const url = args[0];
        if (!url || !/likee/.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a valid Likee link!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        // Using a universal downloader for Likee
        const response = await axios.get(`https://api.vreden.web.id/api/likee?url=${encodeURIComponent(url)}`);
        
        if (!response.data || !response.data.status) {
            throw new Error('Failed to fetch from API');
        }

        const result = response.data.result;

        await sock.sendMessage(chatId, {
            video: { url: result.video_url || result.no_watermark || result.url },
            caption: `✅ *Likee Downloader*\n\n© ${settings.botName}`,
            mimetype: 'video/mp4'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in likee command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to download Likee video.' }, { quoted: msg });
    }
};
