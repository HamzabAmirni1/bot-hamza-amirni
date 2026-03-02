const axios = require("axios");
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../../settings');

async function searchPinterest(query) {
    try {
        const base = "https://www.pinterest.com";
        const search = "/resource/BaseSearchResource/get/";
        const params = {
            source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
            data: JSON.stringify({
                options: { isPrefetch: false, query, scope: "pins", bookmarks: [""], page_size: 10 },
                context: {}
            }),
            _: Date.now()
        };

        const { data } = await axios.get(`${base}${search}`, {
            headers: {
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'x-requested-with': 'XMLHttpRequest'
            },
            params
        });

        const results = data.resource_response?.data?.results?.filter(v => v.images?.orig);
        if (!results || results.length === 0) return null;

        return results.map(result => ({
            title: result.title || "Pinterest Image",
            image: result.images.orig.url,
            url: `https://pinterest.com/pin/${result.id}`
        }));
    } catch (error) {
        return null;
    }
}

module.exports = async (sock, chatId, msg, args) => {
    const query = args.join(' ');
    if (!query) return sock.sendMessage(chatId, { text: `• *مثال:* .pinterest cat` }, { quoted: msg });

    await sock.sendMessage(chatId, { react: { text: "📌", key: msg.key } });

    try {
        const pins = await searchPinterest(query);
        if (!pins) return sock.sendMessage(chatId, { text: "❌ ملقيت والو فهاد البحث." }, { quoted: msg });

        const selectedPins = pins.slice(0, 5);
        let cards = [];

        for (let pin of selectedPins) {
            const { imageMessage } = await generateWAMessageContent({ image: { url: pin.image } }, { upload: sock.waUploadToServer });

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📌 ${pin.title}` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    hasMediaAttachment: true,
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        { "name": "cta_url", "buttonParamsJson": JSON.stringify({ display_text: "عرض المصدر", url: pin.url }) }
                    ]
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

    } catch (err) {
        console.error('Pinterest Error:', err);
        await sock.sendMessage(chatId, { text: "❌ وقع خطأ أثناء البحث." }, { quoted: msg });
    }
};
