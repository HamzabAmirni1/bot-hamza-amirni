const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const AXIOS = { timeout: 25000, maxRedirects: 10, headers: { 'user-agent': UA } };

async function trySiputzx(platform, url) {
    try {
        const res = await axios.get(
            `https://api.siputzx.my.id/api/d/${platform}?url=${encodeURIComponent(url)}`,
            AXIOS
        );
        if (!res.data?.status) return null;
        const d = res.data.data || res.data.result || {};
        return d.video || d.video_url || d.video_hd || d.no_watermark || d.url || null;
    } catch {
        return null;
    }
}

async function scrapeMediaFromPage(url) {
    const res = await axios.get(url, AXIOS);
    const html = String(res.data);

    const ogVideo = html.match(/property="og:video(?::secure_url)?" content="([^"]+)"/i)?.[1];
    if (ogVideo) return { type: 'video', url: ogVideo };

    const videos = [...html.matchAll(/https?:\/\/[^"'\s\\]+\.(?:mp4|webm)/gi)].map(m => m[0].replace(/\\u002F/g, '/'));
    if (videos.length) return { type: 'video', url: videos[0] };

    const ogImage = html.match(/property="og:image" content="([^"]+)"/i)?.[1];
    if (ogImage) return { type: 'image', url: ogImage };

    const images = [...html.matchAll(/https?:\/\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)/gi)]
        .map(m => m[0].replace(/\\u002F/g, '/'));
    const best = images.find(u => /original|736x|1080/i.test(u)) || images[0];
    if (best) return { type: 'image', url: best };

    return null;
}

async function downloadReddit(url) {
    const clean = url.split('?')[0].replace(/\/?$/, '');
    const jsonUrl = clean.includes('.json') ? clean : `${clean}.json`;

    try {
        const res = await axios.get(jsonUrl, {
            ...AXIOS,
            headers: { ...AXIOS.headers, Accept: 'application/json' }
        });
        const post = res.data?.[0]?.data?.children?.[0]?.data;
        if (post) {
            const video = post.secure_media?.reddit_video?.fallback_url
                || post.media?.reddit_video?.fallback_url;
            if (video) return { type: 'video', url: video };

            const img = post.url_overridden_by_dest || post.url;
            if (img && /\.(jpg|jpeg|png|gif|webp)/i.test(img)) {
                return { type: 'image', url: img };
            }
        }
    } catch (e) {
        console.log('[socialDownload] reddit json failed:', e.message);
    }

    const scraped = await scrapeMediaFromPage(url);
    if (scraped) return scraped;

    const sip = await trySiputzx('reddit', url);
    if (sip) return { type: 'video', url: sip };

    return null;
}

async function downloadCapcut(url) {
    try {
        const { data } = await axios.post('https://3bic.com/api/download', { url }, {
            ...AXIOS,
            headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': UA }
        });
        if (data?.originalVideoUrl?.includes('/api/cdn/')) {
            const b64 = data.originalVideoUrl.split('/api/cdn/')[1];
            const videoUrl = Buffer.from(b64, 'base64').toString();
            if (videoUrl.startsWith('http')) {
                return { type: 'video', url: videoUrl, title: data.title, author: data.authorName };
            }
        }
    } catch (e) {
        console.log('[socialDownload] capcut 3bic failed:', e.message);
    }

    const sip = await trySiputzx('capcut', url);
    if (sip) return { type: 'video', url: sip };

    const scraped = await scrapeMediaFromPage(url);
    if (scraped) return scraped;

    return null;
}

async function downloadSnapchat(url) {
    for (const platform of ['snapchat', 'snap']) {
        const sip = await trySiputzx(platform, url);
        if (sip) return { type: 'video', url: sip };
    }
    const scraped = await scrapeMediaFromPage(url);
    if (scraped) return scraped;
    return null;
}

async function downloadLikee(url) {
    for (const platform of ['likee', 'like']) {
        const sip = await trySiputzx(platform, url);
        if (sip) return { type: 'video', url: sip };
    }
    const scraped = await scrapeMediaFromPage(url);
    if (scraped) return scraped;
    return null;
}

module.exports = {
    downloadReddit,
    downloadCapcut,
    downloadSnapchat,
    downloadLikee,
    scrapeMediaFromPage,
    trySiputzx
};
