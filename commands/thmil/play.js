const yts = require('yt-search');
const axios = require('axios');
const { t } = require('../../lib/language');
const settings = require('../../settings');

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

async function getYtconvertAudio(url) {
    const headers = { accept: "application/json", "content-type": "application/json", referer: "https://ytmp3.gg/" };
    const payload = { url, os: "android", output: { type: "audio", format: "mp3", quality: "320kbps" } };
    let init;
    try { init = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers, timeout: 15000 }); }
    catch { init = await axios.post("https://api.ytconvert.org/api/download", payload, { headers, timeout: 15000 }); }
    if (!init?.data?.statusUrl) throw new Error("YTConvert empty");
    for (let i = 0; i < 30; i++) {
        const { data } = await axios.get(init.data.statusUrl, { headers, timeout: 10000 });
        if (data.status === "completed") return { download: data.downloadUrl, title: "Audio" };
        if (data.status === "failed") throw new Error("Failed");
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Timeout");
}

async function getSpotifyFallback(query) {
    const res = await tryRequest(() => axios.get(`https://api.ootaizumi.web.id/downloader/spotifyplay?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS));
    if (res?.data?.status && res?.data?.result?.download) {
        return { download: res.data.result.download, title: res.data.result.title };
    }
    throw new Error('Spotify API failed');
}

async function getVredenAudio(url) {
    const res = await tryRequest(() => axios.get(`https://api.vreden.web.id/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}&quality=320`, AXIOS_DEFAULTS));
    if (res?.data?.result?.download?.url) {
        return { download: res.data.result.download.url, title: res.data.result.title };
    }
    throw new Error('Vreden failed');
}

async function getNekolabsAudio(url) {
    const res = await tryRequest(() => axios.get(`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp3`, AXIOS_DEFAULTS));
    if (res?.data?.result?.downloadUrl) {
        return { download: res.data.result.downloadUrl, title: res.data.result.title };
    }
    throw new Error('Nekolabs failed');
}

async function playCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        // 1. Robust Input Extraction
        let searchQuery = "";

        // Priority 1: Check matches passed from handler (button IDs often come here)
        // Check if `match` argument exists in function signature, if not, construct it
        // The handler usually passes (sock, chatId, msg, args, commands, userLang, match)
        // But here args 4 (commands) and 5 (userLang) might be shifted if signature varies.
        // Let's rely on 'args' join first.

        if (args && args.length > 0) {
            searchQuery = args.join(' ');
        } else {
            // Fallback: extract from message body if args failed
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            // Remove command prefix and command name
            searchQuery = body.replace(/^\S+\s+/, '').trim();
        }

        // Clean up query if it contains the command itself (rare edge case with button IDs)
        if (searchQuery.startsWith('.play')) {
            searchQuery = searchQuery.replace('.play', '').trim();
        }

        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: t('play.usage', {}, userLang)
            }, { quoted: msg });
        }

        // Add start reaction
        await sock.sendMessage(chatId, { react: { text: '🎧', key: msg.key } });

        // Search for song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: t('play.no_results', {}, userLang) }, { quoted: msg });
        }

        // Get first video result
        const video = videos[0];
        const urlYt = video.url;

        // Send thumbnail as visual feedback BEFORE download starts
        const caption = t('play.downloading_thumb', {
            title: video.title,
            duration: video.timestamp
        }, userLang);

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: msg });

        // Try multiple APIs for audio download using global utility
        const { downloadYouTube } = require('../../lib/ytdl');
        let audioData = await downloadYouTube(urlYt, 'mp3');

        if (!audioData) {
            try {
                audioData = await getYtconvertAudio(urlYt);
            } catch (e1) {
                try {
                    audioData = await getVredenAudio(urlYt);
                } catch (e2) {
                    try {
                        audioData = await getNekolabsAudio(urlYt);
                    } catch (e3) {
                        try {
                            audioData = await getYupraAudioByUrl(urlYt);
                        } catch (e4) {
                            try {
                                audioData = await getSpotifyFallback(searchQuery);
                            } catch (e5) {
                                return await sock.sendMessage(chatId, {
                                    text: t('download.yt_error', {}, userLang)
                                }, { quoted: msg });
                            }
                        }
                    }
                }
            }
        }

        const audioUrl = audioData.downloadUrl || audioData.download;
        const finalTitle = audioData.title || video.title;

        // Download audio to buffer using axios (supports Referer header — required by SaveTube)
        let audioBuffer;
        try {
            const resp = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'identity',
                    ...(audioData.referer ? { 'Referer': audioData.referer } : {})
                }
            });
            audioBuffer = Buffer.from(resp.data);
        } catch (e) {
            console.error('[play] buffer fetch error:', e.message);
            throw new Error(`Failed to download audio from provider: ${e.message}`);
        }

        if (!audioBuffer || audioBuffer.length === 0) throw new Error("Empty audio buffer.");

        // Download thumbnail as buffer for the externalAdReply
        let thumbBuffer;
        try {
            const thumbResp = await axios.get(video.thumbnail, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            thumbBuffer = Buffer.from(thumbResp.data);
        } catch (e) {
            console.error("Failed to download thumbnail:", e.message);
        }

        const { toAudio } = require('../../lib/converter');
        let finalBuffer = audioBuffer;
        let finalMimetype = "audio/mp4";

        const isMp3 = audioBuffer.slice(0, 3).toString() === 'ID3' || audioBuffer[0] === 0xFF;
        if (!isMp3) {
            try {
                let ext = 'mp4';
                if (audioBuffer.slice(0, 4).toString() === 'OggS') ext = 'ogg';
                else if (audioBuffer.slice(0, 4).toString() === 'RIFF') ext = 'wav';
                finalBuffer = await toAudio(audioBuffer, ext);
            } catch (convErr) {
                console.error("Conversion failed:", convErr.message);
            }
        }

        // Send audio with buffer thumbnail to prevent Baileys string URL parsing hangs
        await sock.sendMessage(chatId, {
            audio: finalBuffer,
            mimetype: finalMimetype,
            fileName: `${finalTitle}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: finalTitle,
                    body: settings.botName,
                    mediaType: 2,
                    renderLargerThumbnail: true,
                    thumbnail: thumbBuffer
                }
            }
        }, { quoted: msg });

        // Add success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in play command:', error);
        await sock.sendMessage(chatId, {
            text: t('download.yt_error', {}, userLang) + `: ${error.message}`
        }, { quoted: msg });
        await sock.sendMessage(chatId, { text: t('play.error', {}, userLang) }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = playCommand;

/*Powered by Hamza Amirni*/

