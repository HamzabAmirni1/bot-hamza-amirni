const { t } = require('../../lib/language');
const settings = require('../../settings');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { setUserLanguage } = require('../../lib/userLogger');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;

        // If arguments are provided (e.g. .setlang ar), act immediately
        if (args[0]) {
            const input = args[0].toLowerCase();
            let newLang = null;

            if (input === '1' || input === 'en' || input === 'english') {
                newLang = 'en';
            } else if (input === '2' || input === 'ar' || input === 'arabic' || input === 'العربية' || input === 'عربية') {
                newLang = 'ar';
            } else if (input === '3' || input === 'ma' || input === 'darija' || input === 'moroccan' || input === 'الدارجة' || input === 'دارجة') {
                newLang = 'ma';
            } else {
                return await sock.sendMessage(chatId, {
                    text: t('setlang.unsupported', { lang: input }, userLang)
                }, { quoted: msg });
            }

            setUserLanguage(senderId, newLang);
            const confirmMsg = t('setlang.success', {}, newLang);
            await sock.sendMessage(chatId, { text: confirmMsg }, { quoted: msg });
            return;
        }

        // Interactive Card Mode
        async function createHeaderImage(url) {
            try {
                const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (e) {
                // Fallback
                return null;
            }
        }

        const cards = [
            {
                title: "اللغة العربية",
                body: "اضغط هنا لاختيار اللغة العربية",
                id: ".setlang ar",
                img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Flag_of_the_Arab_League.svg/2560px-Flag_of_the_Arab_League.svg.png"
            },
            {
                title: "English Language",
                body: "Click here to select English",
                id: ".setlang en",
                img: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/1200px-Flag_of_the_United_States.svg.png"
            },
            {
                title: "الدارجة المغربية",
                body: "ورك هنا باش تختار الدارجة",
                id: ".setlang ma",
                img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Flag_of_Morocco.svg/2000px-Flag_of_Morocco.svg.png"
            }
        ];

        let carouselCards = [];
        for (let card of cards) {
            const imageMessage = await createHeaderImage(card.img);
            carouselCards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: card.body }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: card.title,
                    hasMediaAttachment: true,
                    imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [{ "name": "quick_reply", "buttonParamsJson": JSON.stringify({ display_text: "Select / اختيار", id: card.id }) }]
                })
            });
        }

        const msgContent = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `🌍 *Language Selection / اختيار اللغة*\n\n` +
                                `Please select your preferred language below.\n` +
                                `المرجو اختيار لغتك المفضلة أسفله.`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `乂 ${settings.botName} 🌐` }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards: carouselCards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, msgContent.message, { messageId: msgContent.key.id });

    } catch (error) {
        console.error("Error in setlang:", error);
        await sock.sendMessage(chatId, { text: "❌ Error showing language menu." });
    }
};
