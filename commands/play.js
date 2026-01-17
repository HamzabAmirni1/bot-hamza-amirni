const yts = require('yt-search');
const axios = require('axios');
const { t } = require('../lib/language');
const settings = require('../settings');

async function playCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            const usageMsg = userLang === 'ma'
                ? "⚠️ *كتب ليا سمية الأغنية.*\n📝 مثال: .play طوطو"
                : userLang === 'ar'
                    ? "⚠️ *يرجى كتابة اسم الأغنية.*\n📝 مثال: .play سورة البقرة"
                    : "⚠️ *Please provide a song name.*\n📝 Example: .play funny cats";
            return await sock.sendMessage(chatId, { 
                text: usageMsg
            }, { quoted: msg });
        }

        // Search for song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: t('download.yt_no_result', {}, userLang)
            }, { quoted: msg });
        }

        // Send loading message
        const loadingMsg = userLang === 'ma'
            ? "⏳ *صبر، كنقلب ليك...*"
            : userLang === 'ar'
                ? "⏳ *يرجى الانتظار، جاري التحميل...*"
                : "⏳ *Please wait, downloading...*";
        
        await sock.sendMessage(chatId, {
            text: loadingMsg
        }, { quoted: msg });

        // Get first video result
        const video = videos[0];
        const urlYt = video.url;

        // Fetch audio data from API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: t('download.yt_error', {}, userLang)
            }, { quoted: msg });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // Send audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            caption: `*${title}*\n\n> *_Downloaded by ${settings.botName}_*`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in play command:', error);
        await sock.sendMessage(chatId, { 
            text: t('download.yt_error', {}, userLang) + `: ${error.message}`
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = playCommand;

/*Powered by KNIGHT-BOT*
*Credits to Keith MD*/
