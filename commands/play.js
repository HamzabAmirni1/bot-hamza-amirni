const yts = require('yt-search');
const axios = require('axios');
const { t } = require('../lib/language');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        // 1. Get Query
        const searchQuery = args.join(' ');
        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: t('play.no_query', {}, userLang)
            }, { quoted: msg });
        }

        // 2. Initial React & Search Message
        await sock.sendMessage(chatId, { react: { text: "🎧", key: msg.key } });

        // Search YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, {
                text: t('play.no_results', {}, userLang)
            }, { quoted: msg });
        }

        const video = videos[0];
        const videoUrl = video.url;

        // 3. Send "Downloading..." Message with Thumbnail (Aesthetic)
        // Using "wait" message from translation which includes the user's requested vibe
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `🎵 *${video.title}*\n\n${t('play.wait', {}, userLang)}\n\n⏱️ _${video.timestamp}_ | 👀 _${video.views.toLocaleString()}_`
        }, { quoted: msg });

        // 4. Download Audio
        // Using robust multi-API system
        let audioUrl = null;
        let finalTitle = video.title;

        // Try consecutive APIs
        const apiList = [
            `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`,
            `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(videoUrl)}`
        ];

        const https = require('https');
        const agent = new https.Agent({ rejectUnauthorized: false });

        for (const url of apiList) {
            try {
                console.log(`[play.js] Trying API: ${url.split('?')[0]}`);
                const response = await axios.get(url, {
                    timeout: 20000,
                    httpsAgent: url.includes('itzpire') || url.includes('officialhectormanuel') ? agent : undefined
                });

                // Handle different response structures
                const data = response.data;
                if (data && (data.status === true || data.status === 200 || data.success || data.result)) {
                    if (data.audio) audioUrl = data.audio;
                    else if (data.result && data.result.download) audioUrl = data.result.download;
                    else if (data.result && data.result.url) audioUrl = data.result.url;
                    else if (data.data && data.data.download && data.data.download.url) audioUrl = data.data.download.url;
                    else if (data.url) audioUrl = data.url;

                    if (audioUrl) {
                        finalTitle = data.title || (data.result && data.result.title) || (data.data && data.data.title) || finalTitle;
                        break;
                    }
                }
            } catch (e) {
                console.log(`[play.js] API failed (${url.split('?')[0]}):`, e.message);
            }
        }

        if (!audioUrl) {
            return await sock.sendMessage(chatId, {
                text: t('play.error_api', {}, userLang)
            }, { quoted: msg });
        }

        // 5. Send Audio with External Ad Reply (Premium Feel)
        await sock.sendMessage(chatId, { react: { text: "⬆️", key: msg.key } });

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${finalTitle}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: finalTitle,
                    body: video.author?.name || "Queen Riam Music",
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: videoUrl,
                    mediaType: 2, // 2 for Video (shows thumbnail well), 1 for Image
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Error in play command:', error);
        try {
            await sock.sendMessage(chatId, {
                text: t('play.error_generic', {}, userLang) + (error.message ? `\n\nError: ${error.message}` : '')
            }, { quoted: msg });
        } catch (e) { }
    }
};
