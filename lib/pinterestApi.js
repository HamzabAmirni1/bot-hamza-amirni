const axios = require('axios');

const BASE = 'https://www.pinterest.com';
const SEARCH_PATH = '/resource/BaseSearchResource/get/';
const PIN_PATH = '/resource/PinResource/get/';

const BROWSER_HEADERS = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    referer: `${BASE}/`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-app-version': 'a9522f',
    'x-pinterest-appstate': 'active',
    'x-pinterest-pws-handler': 'www/search/[scope].js',
    'x-requested-with': 'XMLHttpRequest'
};

const AXIOS_OPTS = { timeout: 20000, maxRedirects: 5 };

async function getPinterestSession() {
    const res = await axios.get(BASE, {
        ...AXIOS_OPTS,
        headers: { 'user-agent': BROWSER_HEADERS['user-agent'] }
    });
    const setCookie = res.headers['set-cookie'];
    if (!setCookie?.length) return null;

    const cookies = setCookie.map(c => c.split(';')[0].trim()).join('; ');
    const csrfMatch = setCookie.find(c => c.startsWith('csrftoken='));
    const csrf = csrfMatch ? csrfMatch.split(';')[0].split('=')[1] : null;

    return {
        cookies,
        headers: {
            ...BROWSER_HEADERS,
            cookie: cookies,
            ...(csrf ? { 'x-csrftoken': csrf } : {})
        }
    };
}

function normalizePins(items) {
    if (!items?.length) return [];
    return items
        .filter(p => p.image)
        .map(p => ({
            title: (p.title || 'Pinterest Image').slice(0, 120),
            image: p.image,
            url: p.url || p.pin || BASE
        }));
}

async function searchViaSiputzx(query) {
    const res = await axios.get(
        `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
        AXIOS_OPTS
    );
    if (!res.data?.status || !res.data?.data?.length) return [];

    return normalizePins(res.data.data.map(item => ({
        title: item.grid_title || item.description || 'Pinterest',
        image: item.image_url,
        url: item.pin || `${BASE}/pin/${item.id}/`,
        pin: item.pin
    })));
}

async function searchViaPinterestApi(query) {
    const session = await getPinterestSession();
    if (!session) return [];

    const params = {
        source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
        data: JSON.stringify({
            options: { isPrefetch: false, query, scope: 'pins', bookmarks: [''], page_size: 10 },
            context: {}
        }),
        _: Date.now()
    };

    const res = await axios.get(`${BASE}${SEARCH_PATH}`, {
        ...AXIOS_OPTS,
        headers: session.headers,
        params
    });

    const results = res.data?.resource_response?.data?.results?.filter(v => v.images?.orig);
    if (!results?.length) return [];

    return normalizePins(results.map(r => ({
        title: r.title || r.grid_title,
        image: r.images.orig.url,
        url: `${BASE}/pin/${r.id}/`
    })));
}

async function searchPinterest(query) {
    const q = (query || '').trim();
    if (!q) return [];

    for (const fn of [searchViaSiputzx, searchViaPinterestApi]) {
        try {
            const pins = await fn(q);
            if (pins.length) return pins;
        } catch (e) {
            console.log(`[Pinterest] search ${fn.name} failed:`, e.message);
        }
    }
    return [];
}

function extractPinId(url) {
    const m = String(url).match(/\/pin\/(\d+)/);
    return m ? m[1] : null;
}

async function resolvePinterestUrl(url) {
    try {
        const res = await axios.get(url, {
            ...AXIOS_OPTS,
            maxRedirects: 10,
            headers: { 'user-agent': BROWSER_HEADERS['user-agent'] },
            validateStatus: s => s < 400
        });
        const final = res.request?.res?.responseUrl || res.config?.url || url;
        return final;
    } catch {
        return url;
    }
}

async function downloadViaPinPage(url) {
    const resolved = await resolvePinterestUrl(url);
    const res = await axios.get(resolved, {
        ...AXIOS_OPTS,
        headers: { 'user-agent': BROWSER_HEADERS['user-agent'] }
    });
    const html = res.data || '';

    const videoMatch = html.match(/https:\/\/v\d*\.pinimg\.com\/[^"\\]+\.mp4/i)
        || html.match(/property="og:video"[^>]+content="([^"]+)"/i)
        || html.match(/"contentUrl":"(https:\/\/[^"]+\.mp4)"/i);
    if (videoMatch) {
        const videoUrl = videoMatch[1] || videoMatch[0];
        return { type: 'video', url: videoUrl.replace(/\\u002F/g, '/') };
    }

    const imageMatches = [...html.matchAll(/https:\/\/i\.pinimg\.com\/[^"\\]+\.(?:jpg|jpeg|png|webp)/gi)]
        .map(m => m[0].replace(/\\u002F/g, '/'));
    const unique = [...new Set(imageMatches)];
    const best = unique.find(u => u.includes('/originals/'))
        || unique.find(u => u.includes('/736x/'))
        || unique[0];
    if (best) return { type: 'image', url: best };

    return null;
}

async function downloadViaPinResource(pinId) {
    const session = await getPinterestSession();
    if (!session) return null;

    const params = {
        source_url: `/pin/${pinId}/`,
        data: JSON.stringify({ options: { id: pinId }, context: {} }),
        _: Date.now()
    };

    const res = await axios.get(`${BASE}${PIN_PATH}`, {
        ...AXIOS_OPTS,
        headers: { ...session.headers, 'x-pinterest-pws-handler': 'www/pin/[id].js' },
        params
    });

    const pin = res.data?.resource_response?.data;
    if (!pin) return null;

    if (pin.videos?.video_list) {
        const list = Object.values(pin.videos.video_list).filter(v => v?.url);
        const best = list.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        if (best?.url) return { type: 'video', url: best.url };
    }

    const img = pin.images?.orig?.url || pin.images?.['736x']?.url;
    if (img) return { type: 'image', url: img };

    return null;
}

async function downloadViaSnappin(url) {
    const home = await axios.get('https://snappin.app/', {
        ...AXIOS_OPTS,
        headers: { 'user-agent': BROWSER_HEADERS['user-agent'] }
    });
    const setCookie = home.headers['set-cookie'];
    if (!setCookie?.length) return null;

    const cookies = setCookie.map(c => c.split(';')[0]).join('; ');
    const csrfMatch = home.data?.match(/<meta name="csrf-token" content="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    const post = await axios.post('https://snappin.app/', { url }, {
        ...AXIOS_OPTS,
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrf,
            Cookie: cookies,
            Referer: 'https://snappin.app',
            Origin: 'https://snappin.app',
            'User-Agent': BROWSER_HEADERS['user-agent']
        }
    });

    const html = post.data || '';
    const links = [...html.matchAll(/href="(\/download\/[^"]+|https:\/\/[^"]+\.(?:mp4|jpg|jpeg|png|webp))"/gi)]
        .map(m => m[1].startsWith('http') ? m[1] : `https://snappin.app${m[1]}`);

    for (const link of links) {
        try {
            const head = await axios.head(link, { ...AXIOS_OPTS, maxRedirects: 5 });
            const ct = head.headers['content-type'] || '';
            if (ct.includes('video')) return { type: 'video', url: link };
            if (ct.includes('image')) return { type: 'image', url: link };
        } catch { /* try next */ }
    }
    return null;
}

async function downloadPinterestPin(url) {
    const raw = (url || '').trim();
    if (!raw) return null;

    const resolved = await resolvePinterestUrl(raw);
    const pinId = extractPinId(resolved);

    const methods = [
        () => downloadViaPinPage(resolved),
        () => pinId ? downloadViaPinResource(pinId) : null,
        () => downloadViaSnappin(resolved)
    ];

    for (const fn of methods) {
        try {
            const result = await fn();
            if (result?.url) return result;
        } catch (e) {
            console.log(`[Pinterest] download ${fn.name || 'method'} failed:`, e.message);
        }
    }
    return null;
}

function isPinterestPinUrl(text) {
    return /(?:https?:\/\/)?(?:www\.)?(?:pin\.it\/|pinterest\.(?:com|fr|de|es|it|co\.uk)\/pin\/)/i.test(text);
}

module.exports = {
    searchPinterest,
    downloadPinterestPin,
    isPinterestPinUrl,
    resolvePinterestUrl
};
