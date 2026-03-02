const axios = require('axios');
const { ytmp3, ytmp4 } = require('ruhend-scraper');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Downloads YouTube video or audio using multiple APIs and scrapers.
 * @param {string} url YouTube URL
 * @param {string} type 'mp3' or 'mp4'
 * @returns {Promise<{downloadUrl: string, title: string, thumbnail: string}>}
 */
async function downloadYouTube(url, type = 'mp3') {
    let downloadUrl = null;
    let title = 'Hamza Amirni';
    let thumbnail = '';

    // Expanded and optimized API List for 2026
    const apiList = type === 'mp3' ? [
        `https://btch.xyz/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://yt.le37.xyz/api/download?url=${encodeURIComponent(url)}&format=mp3`,
        `https://popcat.xyz/api/yt-dl?url=${encodeURIComponent(url)}`,
        `https://api.boxiimyz.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.darkness.biz.id/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.agungnx.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
        `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.diioffc.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.shizune.tech/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(url)}`,
        `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(url)}`,
        `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`
    ] : [
        `https://btch.xyz/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://yt.le37.xyz/api/download?url=${encodeURIComponent(url)}&format=mp4`,
        `https://popcat.xyz/api/yt-dl?url=${encodeURIComponent(url)}`,
        `https://api.boxiimyz.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.darkness.biz.id/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.agungnx.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
        `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.diioffc.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.shizune.tech/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.guruapi.tech/videodownloader/ytmp4?url=${encodeURIComponent(url)}`,
        `https://itzpire.com/download/youtube-mp4?url=${encodeURIComponent(url)}`,
        `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`
    ];

    // 1. Try REST APIs
    for (const apiUrl of apiList) {
        const providerName = new URL(apiUrl).hostname;
        try {
            console.log(`[ytdl.js] Trying provider: ${providerName}...`);
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                httpsAgent: agent
            });

            const data = response.data;
            if (data && (data.status === true || data.status === 200 || data.success || data.result || data.data)) {
                title = data.title || (data.result && data.result.title) || (data.data && data.data.name) || (data.data && data.data.title) || title;
                thumbnail = data.thumbnail || (data.result && data.result.thumbnail) || (data.data && data.data.thumbnail) || (data.result && data.result.thumb) || thumbnail;

                if (type === 'mp3') {
                    downloadUrl = data.audio || data.link || (data.result && data.result.download) || (data.result && data.result.url) || (data.data && data.data.download && data.data.download.url) || (data.result && data.result.mp3) || (data.data && data.data.url) || data.url;
                } else {
                    if (data.videos) {
                        downloadUrl = data.videos["360"] || data.videos["480"] || data.videos["720"] || Object.values(data.videos)[0];
                    } else {
                        downloadUrl = data.link || (data.result && data.result.download) || (data.result && data.result.url) || (data.data && (data.data.url || data.data.download)) || (data.result && data.result.mp4) || data.url;
                        if (downloadUrl && typeof downloadUrl === 'object') downloadUrl = downloadUrl.url || downloadUrl.download;
                    }
                }

                // VALIDATION: Check if downloadUrl is actually reachable
                if (downloadUrl && typeof downloadUrl === 'string') {
                    try {
                        const check = await axios.head(downloadUrl, { timeout: 10000, httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
                        if (check && check.status >= 200 && check.status < 400) {
                            console.log(`[ytdl.js] ✅ Success with ${providerName}`);
                            return { downloadUrl, title, thumbnail, source: providerName };
                        } else {
                            // Try a GET with 1 byte to be sure if HEAD is blocked
                            const checkGet = await axios.get(downloadUrl, {
                                timeout: 10000,
                                httpsAgent: agent,
                                headers: { 'Range': 'bytes=0-1', 'User-Agent': 'Mozilla/5.0' }
                            }).catch(() => null);
                            if (checkGet && checkGet.status >= 200 && checkGet.status < 400) {
                                console.log(`[ytdl.js] ✅ Success with ${providerName} (via GET)`);
                                return { downloadUrl, title, thumbnail, source: providerName };
                            }
                        }
                    } catch (e) {
                        console.log(`[ytdl.js] URL Validation failed for ${providerName}:`, e.message);
                    }
                }
            }
        } catch (e) {
            console.log(`[ytdl.js] ❌ ${providerName} failed:`, e.message);
        }
    }

    // 2. Fallback to local ytdl2 utility (distube/ytdl-core)
    try {
        console.log(`[ytdl.js] All external APIs failed. Attempting local ytdl2 fallback...`);
        const ytdl2 = require('./ytdl2');
        if (type === 'mp3') {
            const res = await ytdl2.mp3(url);
            if (res && res.path) {
                console.log(`[ytdl.js] ✅ Success with local ytdl2 (MP3)`);
                return {
                    downloadUrl: res.path,
                    title: (res.meta && res.meta.title) || title,
                    thumbnail: (res.meta && res.meta.thumbnail) || thumbnail,
                    isLocal: true,
                    source: 'ytdl2'
                };
            }
        } else { // type === 'mp4'
            const res = await ytdl2.mp4(url, '134'); // 360p or highest available
            if (res && res.videoUrl) {
                console.log(`[ytdl.js] ✅ Success with local ytdl2 (MP4 Stream URL)`);
                return {
                    downloadUrl: res.videoUrl,
                    title: res.title || title,
                    thumbnail: (res.thumb && res.thumb.url) || thumbnail,
                    source: 'ytdl2'
                };
            }
        }
    } catch (e) {
        console.log(`[ytdl.js] ytdl2 fallback failed:`, e.message);
    }

    // 3. Last Resort Fallback to ruhend-scraper
    try {
        console.log(`[ytdl.js] Trying ruhend-scraper fallback for ${type}...`);
        const scraper = type === 'mp3' ? ytmp3 : ytmp4;
        const result = await scraper(url);

        if (result && result.download) {
            console.log(`[ytdl.js] ✅ Success with ruhend-scraper`);
            return {
                downloadUrl: result.download,
                title: result.title || title,
                thumbnail: result.thumbnail || (result.thumb) || thumbnail,
                source: 'ruhend-scraper'
            };
        }
    } catch (e) {
        console.log(`[ytdl.js] ruhend-scraper failed:`, e.message);
    }

    return null;
}

module.exports = { downloadYouTube };
