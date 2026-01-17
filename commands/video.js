const axios = require('axios');
const yts = require('yt-search');
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

async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
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

async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    // shape: { status, creator, url, result: { status, title, mp4 } }
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu ytmp4 returned no mp4');
}

async function videoCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        
        if (!searchQuery) {
            const usageMsg = userLang === 'ma'
                ? "⚠️ *كتب ليا سمية الفيديو ولا الليان.*\n📝 مثال: .video طوطو"
                : userLang === 'ar'
                    ? "⚠️ *يرجى كتابة اسم الفيديو أو الرابط.*\n📝 مثال: .video سورة البقرة"
                    : "⚠️ *Please provide a video name or URL.*\n📝 Example: .video funny cats";
            await sock.sendMessage(chatId, { text: usageMsg }, { quoted: msg });
            return;
        }

        // Determine if input is a YouTube link
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // Search YouTube for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: t('download.yt_no_result', {}, userLang) }, { quoted: msg });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Send thumbnail immediately
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `*${captionTitle}*\nDownloading...` 
                }, { quoted: msg });
            }
        } catch (e) { console.error('[VIDEO] thumb error:', e?.message || e); }
        

        // Validate YouTube URL
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: t('download.yt_invalid_url', {}, userLang) }, { quoted: msg });
            return;
        }

        // Get video: try Yupra first, then Okatsu fallback
        let videoData;
        try {
            videoData = await getYupraVideoByUrl(videoUrl);
        } catch (e1) {
            videoData = await getOkatsuVideoByUrl(videoUrl);
        }

        // Send video directly using the download URL
        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${videoData.title || videoTitle || 'video'}.mp4`,
            caption: `*${videoData.title || videoTitle || 'Video'}*\n\n> *_Downloaded by ${settings.botName}_*` 
        }, { quoted: msg });


    } catch (error) {
        console.error('[VIDEO] Command Error:', error?.message || error);
        await sock.sendMessage(chatId, { text: t('download.yt_error', {}, userLang) + `: ${error.message}` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = videoCommand;
