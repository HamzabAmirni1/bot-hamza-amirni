const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const { searchPinterest } = require('../../lib/pinterestApi');

async function sendPinsAsCarousel(sock, chatId, msg, query, pins) {
    const selectedPins = pins.slice(0, 5);
    const cards = [];

    for (const pin of selectedPins) {
        const { imageMessage } = await generateWAMessageContent(
            { image: { url: pin.image } },
            { upload: sock.waUploadToServer }
        );
        cards.push({
            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📌 ${pin.title}` }),
            header: proto.Message.InteractiveMessage.Header.fromObject({
                hasMediaAttachment: true,
                imageMessage
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: [{
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({ display_text: 'عرض المصدر', url: pin.url })
                }]
            })
        });
    }

    const carolMsg = generateWAMessageFromContent(chatId, {
        viewOnceMessage: {
            message: {
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    body: proto.Message.InteractiveMessage.Body.create({ text: `🔎 نتائج البحث عن: *${query}*` }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: settings.botName }),
                    carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                })
            }
        }
    }, { quoted: msg });

    await sock.relayMessage(chatId, carolMsg.message, { messageId: carolMsg.key.id });
}

async function sendPinsAsImages(sock, chatId, msg, query, pins) {
    await sock.sendMessage(chatId, {
        text: `🔎 *نتائج البحث عن:* ${query}\n📌 ${pins.length} صورة\n\n⚔️ ${settings.botName}`
    }, { quoted: msg });

    for (const pin of pins.slice(0, 5)) {
        await sock.sendMessage(chatId, {
            image: { url: pin.image },
            caption: `📌 ${pin.title}\n🔗 ${pin.url}`
        });
        await new Promise(r => setTimeout(r, 800));
    }
}

module.exports = async (sock, chatId, msg, args) => {
    const query = args.join(' ').trim();
    if (!query) {
        return sock.sendMessage(chatId, { text: '• *مثال:* .pinterest cat' }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: '📌', key: msg.key } });

    try {
        const pins = await searchPinterest(query);
        if (!pins.length) {
            return sock.sendMessage(chatId, { text: '❌ ملقيت والو فهاد البحث.' }, { quoted: msg });
        }

        try {
            await sendPinsAsCarousel(sock, chatId, msg, query, pins);
        } catch (carouselErr) {
            console.log('[Pinterest] carousel failed, using images:', carouselErr.message);
            await sendPinsAsImages(sock, chatId, msg, query, pins);
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (err) {
        console.error('Pinterest Error:', err);
        await sock.sendMessage(chatId, { text: '❌ وقع خطأ أثناء البحث.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
