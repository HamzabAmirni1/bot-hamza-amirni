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

    // Standard API List
    const apiList = type === 'mp3' ? [
        `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`,
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://widipe.com/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(url)}`,
        `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(url)}`
    ] : [
        `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`,
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://widipe.com/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://itzpire.com/download/youtube-mp4?url=${encodeURIComponent(url)}`,
        `https://api.guruapi.tech/videodownloader/ytmp4?url=${encodeURIComponent(url)}`
    ];

    // 1. Try REST APIs
    for (const apiUrl of apiList) {
        try {
            const response = await axios.get(apiUrl, {
                timeout: 20000,
                headers: { 'Accept': 'application/json' },
                httpsAgent: apiUrl.includes('itzpire') || apiUrl.includes('officialhectormanuel') ? agent : undefined
            });

            const data = response.data;
            if (data && (data.status === true || data.status === 200 || data.success || data.result)) {
                title = data.title || (data.result && data.result.title) || (data.data && data.data.title) || title;
                thumbnail = data.thumbnail || (data.result && data.result.thumbnail) || (data.data && data.data.thumbnail) || thumbnail;

                if (type === 'mp3') {
                    downloadUrl = data.audio || (data.result && data.result.download) || (data.result && data.result.url) || (data.data && data.data.download && data.data.download.url) || data.url;
                } else {
                    if (data.videos) {
                        downloadUrl = data.videos["360"] || data.videos["480"] || data.videos["720"] || Object.values(data.videos)[0];
                    } else {
                        downloadUrl = (data.result && data.result.download) || (data.result && data.result.url) || (data.data && data.data.download && data.data.download.url) || data.url;
                    }
                }

                if (downloadUrl) return { downloadUrl, title, thumbnail };
            }
        } catch (e) {
            console.log(`[ytdl.js] API failed (${apiUrl.split('?')[0]}):`, e.message);
        }
    }

    // 2. Fallback to ruhend-scraper
    try {
        console.log(`[ytdl.js] Trying ruhend-scraper fallback for ${type}...`);
        const scraper = type === 'mp3' ? ytmp3 : ytmp4;
        const result = await scraper(url);

        if (result && result.download) {
            return {
                downloadUrl: result.download,
                title: result.title || title,
                thumbnail: result.thumbnail || thumbnail
            };
        }
    } catch (e) {
        console.log(`[ytdl.js] ruhend-scraper failed:`, e.message);
    }

    return null;
}

module.exports = { downloadYouTube };
