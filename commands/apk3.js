const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../settings');
const { t } = require('../lib/language');
const aptoide = require('../lib/aptoide');

async function apk3Command(sock, chatId, msg, args, commands, userLang) {
    const query = args.join(' ').trim();
    if (!query) {
        return await sock.sendMessage(chatId, { text: `• *Example:* .apk3 Facebook` }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const results = await aptoide.search(query);
        if (!results || results.length === 0) {
            return await sock.sendMessage(chatId, { text: `❌ No apps found.` });
        }

        async function createHeaderImage(url) {
            try {
                const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (e) {
                const fallback = 'https://ui-avatars.com/api/?name=APK&background=random&size=512';
                const { imageMessage } = await generateWAMessageContent({ image: { url: fallback } }, { upload: sock.waUploadToServer });
                return imageMessage;
            }
        }

        let cards = [];
        for (let app of results.slice(0, 8)) {
            const imageMessage = await createHeaderImage(app.icon || 'https://ui-avatars.com/api/?name=APK&background=random&size=512');
            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `🎮 *App:* ${app.name}\n📏 *Size:* ${app.size}\n🚀 *Fast Server 3*`
                }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `乂 ${settings.botName} 🧠` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: app.name,
                    hasMediaAttachment: true,
                    imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [{ "name": "quick_reply", "buttonParamsJson": `{"display_text":"Download v3 ⬇️","id":".apk ${app.id}"}` }]
                })
            });
        }

        const botMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ text: `📥 *APK Server 3*\n\nHigh speed downloads for: *${query}*` }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${settings.botName}` }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, botMsg.message, { messageId: botMsg.key.id });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error('APK3 Error:', err);
        await sock.sendMessage(chatId, { text: '❌ Server 3 Busy.' });
    }
}

module.exports = apk3Command;
