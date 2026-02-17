const axios = require('axios');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const url = args[0];
        if (!url || !/pinterest\.com\/pin\//.test(url)) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a valid Pinterest Pin link!' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        // Using a reliable Pinterest download API
        const response = await axios.get(`https://api.vreden.web.id/api/pinterest?url=${encodeURIComponent(url)}`);
        
        if (!response.data || !response.data.status) {
            throw new Error('Failed to fetch from API');
        }

        const result = response.data.result;
        
        if (result.type === 'video') {
            await sock.sendMessage(chatId, {
                video: { url: result.url },
                caption: `✅ *Pinterest Video Downloader*\n\n© ${settings.botName}`,
                mimetype: 'video/mp4'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                image: { url: result.url },
                caption: `✅ *Pinterest Image Downloader*\n\n© ${settings.botName}`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in pinterestdl command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to download Pinterest content.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
