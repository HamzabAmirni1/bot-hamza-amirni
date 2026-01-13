const axios = require("axios");
const yts = require("yt-search");

async function ytplayCommand(sock, chatId, msg, args) {
    const query = args.join(' ');
    if (!query) {
        return await sock.sendMessage(chatId, {
            text: "⚠️ يرجى إدخال رابط يوتيوب أو اسم الأغنية.\n\nمثال:\n```.ytplay another love```"
        }, { quoted: msg });
    }

    try {
        let videoUrl = query;

        // Step 1: React while searching and send status
        await sock.sendMessage(chatId, { text: '⏳ *جاري البحث والتحميل، يرجى الانتظار...*' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

        if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) {
                return await sock.sendMessage(chatId, { text: `❌ لم يتم العثور على نتائج لـ: ${query}` }, { quoted: msg });
            }
            videoUrl = search.videos[0].url;
        }

        // Step 2: React while fetching link
        await sock.sendMessage(chatId, { react: { text: "📥", key: msg.key } });

        // Multi-API Download System
        let audioUrl = null;
        let finalTitle = "yt-audio";

        const apiList = [
            `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`,
            `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(videoUrl)}`
        ];

        const https = require('https');
        const agent = new https.Agent({ rejectUnauthorized: false });

        for (const url of apiList) {
            try {
                console.log(`[ytplay.js] Trying API: ${url.split('?')[0]}`);
                const response = await axios.get(url, {
                    timeout: 20000,
                    httpsAgent: url.includes('itzpire') || url.includes('officialhectormanuel') ? agent : undefined
                });

                const data = response.data;
                if (data && (data.status === true || data.status === 200 || data.success || data.result)) {
                    if (data.audio) audioUrl = data.audio;
                    else if (data.result && data.result.download) audioUrl = data.result.download;
                    else if (data.result && data.result.url) audioUrl = data.result.url;
                    else if (data.data && data.data.download && data.data.download.url) audioUrl = data.data.download.url;
                    else if (data.url) audioUrl = data.url;

                    if (audioUrl) {
                        finalTitle = data.title || (data.result && data.result.title) || (data.data && data.data.title) || finalTitle;
                        break;
                    }
                }
            } catch (e) {
                console.log(`[ytplay.js] API failed (${url.split('?')[0]}):`, e.message);
            }
        }

        if (!audioUrl) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(chatId, { text: "❌ فشل جلب الصوت. حاول مرة أخرى بكلمات بحث مختلفة." }, { quoted: msg });
        }

        // Step 3: React while sending audio
        await sock.sendMessage(chatId, { react: { text: "🎶", key: msg.key } });

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${finalTitle}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: finalTitle,
                    body: "Hamza Amirni Music",
                    mediaType: 2,
                    sourceUrl: videoUrl
                }
            }
        }, { quoted: msg });

        // Final ✅ reaction
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error("YTPlay Error:", error.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sock.sendMessage(chatId, { text: "❌ حدث خطأ أثناء معالجة طلبك." }, { quoted: msg });
    }
}

module.exports = ytplayCommand;
