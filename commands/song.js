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
            `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(videoUrl)}`
        ];

        for (const url of apiList) {
            try {
                console.log(`[song.js] Trying API: ${url.split('?')[0]}`);
                const response = await axios.get(url, { timeout: 30000 });

                if (response.data && response.data.status) {
                    if (response.data.audio) audioUrl = response.data.audio;
                    else if (response.data.result && response.data.result.download) audioUrl = response.data.result.download;
                    else if (response.data.data && response.data.data.download && response.data.data.download.url) audioUrl = response.data.data.download.url;

                    if (audioUrl) {
                        title = response.data.title || (response.data.result && response.data.result.title) || (response.data.data && response.data.data.title) || title;
                        break;
                    }
                } else if (response.data && response.data.result && response.data.result.url) {
                    audioUrl = response.data.result.url;
                    break;
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
