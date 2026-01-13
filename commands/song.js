const yts = require('yt-search');
const axios = require('axios');
const { t } = require('../lib/language');
const settings = require('../settings');

async function songCommand(sock, chatId, message, args, commands, userLang) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await sock.sendMessage(chatId, {
                text: t('download.yt_usage', {}, userLang)
            }, { quoted: message });

            // React ❌ when no query
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            return;
        }

        // React 🔎 while searching and send status
        await sock.sendMessage(chatId, { text: t('download.yt_downloading', {}, userLang) }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: "🔎", key: message.key } });

        // Search YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, {
                text: t('download.yt_no_result', {}, userLang)
            }, { quoted: message });

            // React ⚠️ when no results
            await sock.sendMessage(chatId, { react: { text: "⚠️", key: message.key } });
            return;
        }

        // Use first video
        const video = videos[0];
        const videoUrl = video.url;

        // Send video info before download
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `🎵 *${video.title}*\n\n_Downloading..._ 🎶\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: message });

        // React ⏳ while downloading
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // Multi-API Download System
        let audioUrl = null;
        let title = video.title;

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
                console.log(`[song.js] Trying API: ${url.split('?')[0]}`);
                const response = await axios.get(url, {
                    timeout: 20000,
                    httpsAgent: url.includes('itzpire') || url.includes('officialhectormanuel') ? agent : undefined
                });

                const data = response.data;
                if (data && (data.status === true || data.status === 200 || data.success || data.result)) {
                    if (data.audio) audioUrl = data.audio;
                    else if (data.result && data.result.download) audioUrl = data.result.download;
                    else if (data.result && data.result.url) audioUrl = data.result.url;
                    else if (data.data && data.data.download && data.data.download.url) audioUrl = data.data.download.url;
                    else if (data.url) audioUrl = data.url;

                    if (audioUrl) {
                        title = data.title || (data.result && data.result.title) || (data.data && data.data.title) || title;
                        break;
                    }
                }
            } catch (e) {
                console.log(`[song.js] API failed (${url.split('?')[0]}):`, e.message);
            }
        }

        if (!audioUrl) {
            await sock.sendMessage(chatId, {
                text: t('download.yt_error', {}, userLang)
            }, { quoted: message });

            // React 🚫 if all APIs fail
            await sock.sendMessage(chatId, { react: { text: "🚫", key: message.key } });
            return;
        }

        // Send the audio file
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: message });

        // React ✅ on success
        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error('Error in songCommand:', error);
        await sock.sendMessage(chatId, {
            text: t('download.yt_error', {}, userLang)
        }, { quoted: message });

        // React ❌ on error
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
    }
}

module.exports = songCommand;
