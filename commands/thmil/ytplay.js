const axios = require("axios");
const yts = require("yt-search");
const { t } = require("../lib/language");

async function ytplayCommand(sock, chatId, msg, args, commands, userLang) {
    const query = args.join(' ');
    if (!query) {
        return await sock.sendMessage(chatId, {
            text: t('play.usage', {}, userLang)
        }, { quoted: msg });
    }

    try {
        let videoUrl = query;

        if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) {
                return await sock.sendMessage(chatId, { text: t('play.no_results', {}, userLang) }, { quoted: msg });
            }
            const video = search.videos[0];
            videoUrl = video.url;

            // Send thumbnail as visual feedback BEFORE download starts
            await sock.sendMessage(chatId, {
                image: { url: video.thumbnail },
                caption: t('play.downloading_thumb', { title: video.title, duration: video.timestamp }, userLang)
            }, { quoted: msg });
        } else {
            // If it's a direct URL, we can still try to get metadata to show thumbnail
            try {
                const search = await yts(videoUrl);
                const video = search.videos[0] || search;
                if (video && video.thumbnail) {
                    await sock.sendMessage(chatId, {
                        image: { url: video.thumbnail },
                        caption: t('play.direct_url', { title: video.title || 'Video' }, userLang)
                    }, { quoted: msg });
                }
            } catch (e) { }
        }

        // Step 2: React while fetching link
        await sock.sendMessage(chatId, { react: { text: "📥", key: msg.key } });

        // Multi-API Download System
        const { downloadYouTube } = require('../lib/ytdl');
        const downloadResult = await downloadYouTube(videoUrl, 'mp3');

        if (!downloadResult) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(chatId, { text: t('play.error', {}, userLang) }, { quoted: msg });
        }

        const { downloadUrl: audioUrl, title: finalTitle } = downloadResult;


        // Step 3: React while sending audio
        await sock.sendMessage(chatId, { react: { text: "🎶", key: msg.key } });

        // Download audio to buffer accurately
        let audioBuffer;
        if (downloadResult.isLocal) {
            try {
                const fs = require('fs');
                audioBuffer = fs.readFileSync(audioUrl);
            } catch (e) {
                throw new Error("Failed to read local audio file.");
            }
        } else {
            try {
                const resp = await axios.get(audioUrl, {
                    responseType: 'arraybuffer',
                    timeout: 90000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Encoding': 'identity'
                    }
                });
                audioBuffer = Buffer.from(resp.data);
            } catch (e) {
                throw new Error("Failed to download audio from provider.");
            }
        }

        if (!audioBuffer || audioBuffer.length === 0) throw new Error("Empty audio buffer.");

        // Detect Format and Convert to MP3 if needed (safest for WhatsApp)
        const { toAudio } = require('../lib/converter');
        let finalBuffer = audioBuffer;
        let finalMimetype = "audio/mpeg";

        // Simple detection based on first bytes
        const firstBytes = audioBuffer.slice(0, 12).toString('hex');
        const isMp3 = audioBuffer.slice(0, 3).toString() === 'ID3' || audioBuffer[0] === 0xFF;

        if (!isMp3) {
            try {
                // Try to detect extension for converter
                let ext = 'mp4'; // default fallback
                if (audioBuffer.slice(0, 4).toString() === 'OggS') ext = 'ogg';
                else if (audioBuffer.slice(0, 4).toString() === 'RIFF') ext = 'wav';

                finalBuffer = await toAudio(audioBuffer, ext);
            } catch (convErr) {
                console.error("Conversion failed, sending original:", convErr.message);
                // If conversion fails, we'll try sending original but it might fail on WA
            }
        }

        await sock.sendMessage(chatId, {
            audio: finalBuffer,
            mimetype: finalMimetype,
            ptt: false,
            fileName: `${finalTitle}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: finalTitle,
                    body: "Hamza Amirni Music",
                    mediaType: 2,
                    thumbnailUrl: downloadResult.thumbnail,
                    sourceUrl: videoUrl
                }
            }
        }, { quoted: msg });

        // Final ✅ reaction
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error("YTPlay Error:", error.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sock.sendMessage(chatId, { text: t('play.error', {}, userLang) }, { quoted: msg });
    }
}

module.exports = ytplayCommand;
