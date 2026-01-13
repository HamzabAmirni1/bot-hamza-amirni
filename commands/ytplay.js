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
            `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.guruapi.tech/videodownloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://itzpire.com/download/youtube-mp3?url=${encodeURIComponent(videoUrl)}`
        ];

        for (const url of apiList) {
            try {
                console.log(`[ytplay.js] Trying API: ${url.split('?')[0]}`);
                const response = await axios.get(url, { timeout: 30000 });

                if (response.data && response.data.status) {
                    if (response.data.audio) audioUrl = response.data.audio;
                    else if (response.data.result && response.data.result.download) audioUrl = response.data.result.download;
                    else if (response.data.data && response.data.data.download && response.data.data.download.url) audioUrl = response.data.data.download.url;

                    if (audioUrl) {
                        finalTitle = response.data.title || (response.data.result && response.data.result.title) || (response.data.data && response.data.data.title) || finalTitle;
                        break;
                    }
                } else if (response.data && response.data.result && response.data.result.url) {
                    audioUrl = response.data.result.url;
                    break;
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
