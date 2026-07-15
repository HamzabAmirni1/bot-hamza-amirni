const axios = require('axios');
const { checkContent } = require('../../lib/contentFilter');

const CONFIG = {
    video: { ext: ["mp4"], q: ["144p", "240p", "360p", "480p", "720p", "1080p"] }
}

const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Android)",
    referer: "https://ytmp3.gg/"
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function poll(statusUrl) {
    try {
        const { data } = await axios.get(statusUrl, { headers });
        if (data.status === "completed") return data;
        if (data.status === "failed") throw new Error(data.message || "Conversion failed");
        await sleep(2000);
        return poll(statusUrl);
    } catch (e) {
        throw new Error("Polling failed: " + e.message);
    }
}

async function convertYouTube(url, quality = "720p") {
    if (!CONFIG.video.q.includes(quality)) {
        throw new Error(`Invalid quality. Choose: ${CONFIG.video.q.join(", ")}`);
    }

    const { data: meta } = await axios.get("https://www.youtube.com/oembed", {
        params: { url, format: "json" }
    }).catch(() => ({ data: { title: 'YouTube Video', author_name: 'Unknown' } }));

    const payload = {
        url,
        os: "android",
        output: {
            type: "video",
            format: "mp4",
            quality
        }
    }

    let downloadInit;
    try {
        downloadInit = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers });
    } catch {
        try {
            downloadInit = await axios.post("https://api.ytconvert.org/api/download", payload, { headers });
        } catch (e) {
            throw new Error("Downloader API unreachable");
        }
    }

    if (!downloadInit?.data?.statusUrl)
        throw new Error("Converter failed to respond");

    const result = await poll(downloadInit.data.statusUrl);

    return {
        title: meta.title,
        author: meta.author_name,
        downloadUrl: result.downloadUrl,
        filename: `${meta.title.replace(/[^\w\s-]/gi, '')}.mp4`
    }
}

const handler = async (sock, chatId, msg, args, commands, userLang) => {
    if (!args[0]) {
        return sock.sendMessage(chatId, {
            text: `🎬 *YouTube MP4 Downloader*\n\nUsage: .ytmp4 <youtube url> [quality]\n\nAvailable qualities:\n144p, 240p, 360p, 480p, 720p, 1080p\n\nExample:\n.ytmp4 https://youtu.be/xxxxx 720p`
        }, { quoted: msg });
    }

    try {
        const url = args[0];
        const quality = args[1] || "720p";

        await sock.sendMessage(chatId, { text: "⏳ جاري معالجة الفيديو، يرجى الانتظار..." }, { quoted: msg });

        const result = await convertYouTube(url, quality);

        // 🔞 NSFW title check
        if (result.title) {
            const filter = checkContent(result.title, userLang);
            if (filter.blocked) {
                await sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } });
                return await sock.sendMessage(chatId, { text: filter.message }, { quoted: msg });
            }
        }

        await sock.sendMessage(chatId, {
            video: { url: result.downloadUrl },
            caption: `🎬 *YouTube MP4 Download*\n\n📌 *العنوان:* ${result.title}\n📺 *القناة:* ${result.author}\n🎞 *الجودة:* ${quality}\n\nشكراً لاستخدامك بوت حمزة اعمرني ⚔️`,
            fileName: result.filename
        }, { quoted: msg });

    } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ خطأ: " + err.message }, { quoted: msg });
    }
};

module.exports = handler;
