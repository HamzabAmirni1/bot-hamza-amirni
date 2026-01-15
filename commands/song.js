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
        const { downloadYouTube } = require('../lib/ytdl');
        const downloadResult = await downloadYouTube(videoUrl, 'mp3');

        if (!downloadResult) {
            await sock.sendMessage(chatId, {
                text: t('download.yt_error', {}, userLang)
            }, { quoted: message });

            // React 🚫 if all APIs fail
            await sock.sendMessage(chatId, { react: { text: "🚫", key: message.key } });
            return;
        }

        const { downloadUrl: audioUrl, title } = downloadResult;


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
