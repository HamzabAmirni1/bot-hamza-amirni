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
        const { downloadYouTube } = require('../lib/ytdl');
        const downloadResult = await downloadYouTube(videoUrl, 'mp3');

        if (!downloadResult) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(chatId, { text: "❌ فشل جلب الصوت. حاول مرة أخرى بكلمات بحث مختلفة." }, { quoted: msg });
        }

        const { downloadUrl: audioUrl, title: finalTitle } = downloadResult;


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
