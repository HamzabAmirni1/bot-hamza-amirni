const axios = require('axios');
const settings = require('../../settings');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

module.exports = async function imdbCommand(sock, chatId, msg, args) {
    try {
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(chatId, { text: `🎬 الاستخدام: ${settings.prefix}imdb <اسم الفيلم>\nمثال: ${settings.prefix}imdb Iron Man` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: "🎬", key: msg.key } });

        const url = `https://apis.davidcyriltech.my.id/imdb?query=${encodeURIComponent(query)}`;
        const res = await axios.get(url);

        if (!res.data.status || !res.data.movie) {
            await sock.sendMessage(chatId, { text: "❌ لم يتم العثور على نتائج للفيلم المطلوب." }, { quoted: msg });
            return;
        }

        const m = res.data.movie;

        let details = `⭐ *تقييم:* ${m.rated}\n`;
        details += `📅 *تاريخ الإصدار:* ${m.released}\n`;
        details += `⏳ *المدة:* ${m.runtime}\n`;
        details += `🎭 *التصنيف:* ${m.genres}\n`;
        details += `🎥 *المخرج:* ${m.director}\n`;
        details += `✍️ *الكاتب:* ${m.writer}\n`;
        details += `⭐ *IMDb:* ${m.imdbRating}/10 (${m.votes} صوت)\n`;
        if (m.boxoffice) details += `💰 *البوكس أوفيس:* ${m.boxoffice}\n`;

        const plot = m.plot && m.plot !== 'N/A' ? `\n\n📖 *القصة:* ${m.plot}` : '';

        const genImage = await generateWAMessageContent(
            { image: { url: m.poster || 'https://img.freepik.com/premium-vector/movie-poster-with-clapperboard-popcorn-cola-blue-background_142491-177.jpg' } },
            { upload: sock.waUploadToServer }
        );

        const card = {
            body: proto.Message.InteractiveMessage.Body.fromObject({
                text: `${details}${plot}`
            }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `乂 ${settings.botName} 🎬`
            }),
            header: proto.Message.InteractiveMessage.Header.fromObject({
                title: m.title,
                hasMediaAttachment: true,
                imageMessage: genImage.imageMessage
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: [
                    {
                        "name": "cta_url",
                        "buttonParamsJson": JSON.stringify({
                            display_text: "عرض على IMDb 🎬",
                            url: m.imdbUrl
                        })
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
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("IMDb command error:", err.message);
        await sock.sendMessage(chatId, { text: "⚠️ حدث خطأ أثناء جلب بيانات الفيلم." }, { quoted: msg });
    }
};
