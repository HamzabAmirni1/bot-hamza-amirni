const yts = require('yt-search');
const axios = require('axios');
const { t } = require('../lib/language');
const settings = require('../settings');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

async function getYupraAudioByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title,
            thumbnail: res.data.data.thumbnail
        };
    }
    throw new Error('Yupra returned no download');
}

async function getOkatsuAudioByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    // shape: { status, creator, url, result: { status, title, mp3 } }
    if (res?.data?.result?.mp3) {
        return { download: res.data.result.mp3, title: res.data.result.title };
    }
    throw new Error('Okatsu ytmp3 returned no mp3');
}

async function getKeithAudioByUrl(youtubeUrl) {
    const apiUrl = `https://apis-keith.vercel.app/download/dlmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.status && res?.data?.result?.downloadUrl) {
        return { download: res.data.result.downloadUrl, title: res.data.result.title };
    }
    throw new Error('Keith API returned no download');
}

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

        // Try multiple APIs for audio download
        let audioData;
        try {
            audioData = await getYupraAudioByUrl(urlYt);
        } catch (e1) {
            try {
                audioData = await getOkatsuAudioByUrl(urlYt);
            } catch (e2) {
                try {
                    audioData = await getKeithAudioByUrl(urlYt);
                } catch (e3) {
                    return await sock.sendMessage(chatId, { 
                        text: t('download.yt_error', {}, userLang)
                    }, { quoted: msg });
                }
            }
        }

        const audioUrl = audioData.download;
        const title = audioData.title;

        // Send audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: settings.botName,
                    mediaType: 2,
                    renderLargerThumbnail: true,
                    thumbnailUrl: video.thumbnail
                }
            }
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
