const axios = require('axios');
const settings = require('../../settings');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// Utility: split long lyrics into safe chunks for WhatsApp
function chunkText(text, size = 3000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

async function lyricsCommand(sock, chatId, msg, args) {
    const songTitle = args.join(' ').trim();

    if (!songTitle) {
        const helpMsg = `🎵 *البحث عن كلمات الأغاني* 🎵\n\n🔹 *الاستخدام:* ${settings.prefix}lyrics [اسم الأغنية]`;
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
    }

    // 🔞 NSFW Filter
    const { checkContent } = require('../../lib/contentFilter');
    const filter = checkContent(songTitle, 'ar');
    if (filter.blocked) {
        await sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } });
        return await sock.sendMessage(chatId, { text: filter.message }, { quoted: msg });
    }


    try {
        await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

        let song = songTitle;
        let artist = 'غير معروف';
        let lyrics = '';
        let fetched = false;

        // 1. Try David Cyril API
        try {
            const apiUrl = `https://apis.davidcyriltech.my.id/lyrics3?song=${encodeURIComponent(songTitle)}`;
            const response = await axios.get(apiUrl, { timeout: 10000 });
            const json = response.data;
            if (json.success && json.result && json.result.lyrics) {
                song = json.result.song || song;
                artist = json.result.artist || artist;
                lyrics = json.result.lyrics;
                fetched = true;
            }
        } catch (e) {
            console.log(`[Lyrics] David Cyril API failed: ${e.message}`);
        }

        // 2. Try LRCLIB API as fallback
        if (!fetched) {
            try {
                const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(songTitle)}`;
                const response = await axios.get(lrclibUrl, {
                    headers: { 'User-Agent': 'HamzaAmirniBot/1.0.0' },
                    timeout: 10000
                });
                if (Array.isArray(response.data) && response.data.length > 0) {
                    const track = response.data.find(t => t.plainLyrics);
                    if (track) {
                        song = track.name || track.trackName || song;
                        artist = track.artistName || artist;
                        lyrics = track.plainLyrics;
                        fetched = true;
                    }
                }
            } catch (e) {
                console.log(`[Lyrics] LRCLIB API failed: ${e.message}`);
            }
        }

        if (!fetched || !lyrics) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(chatId, { text: `❌ عذراً، لم أتمكن من العثور على كلمات الأغنية لـ "${songTitle}".` }, { quoted: msg });
        }

        const genImage = await generateWAMessageContent(
            { image: { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop' } },
            { upload: sock.waUploadToServer }
        );

        const card = {
            body: proto.Message.InteractiveMessage.Body.fromObject({
                text: `🎶 *الأغنية:* ${song || songTitle}\n👤 *الفنان:* ${artist || 'غير معروف'}`
            }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `乂 ${settings.botName} 🎵`
            }),
            header: proto.Message.InteractiveMessage.Header.fromObject({
                title: "كلمات الأغنية",
                hasMediaAttachment: true,
                imageMessage: genImage.imageMessage
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: [
                    {
                        "name": "quick_reply",
                        "buttonParamsJson": JSON.stringify({ display_text: "بحث عن أغنية أخرى 🔎", id: `${settings.prefix}lyrics ` })
                    }
                ]
            })
        };

        const interactiveMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        ...card,
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            cards: [card]
                        })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, interactiveMsg.message, { messageId: interactiveMsg.key.id });

        const parts = chunkText(lyrics);
        for (const part of parts) {
            await sock.sendMessage(chatId, { text: part });
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Lyrics Error:', error);
        await sock.sendMessage(chatId, { text: `❌ حدث خطأ أثناء جلب كلمات الأغنية.` }, { quoted: msg });
    }
}

module.exports = lyricsCommand;
