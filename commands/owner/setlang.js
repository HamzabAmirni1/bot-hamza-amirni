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

        // Interactive Card Mode (help.js carousel style)
        const fs = require('fs');
        const path = require('path');
        const botName = settings.botName || 'HAMZA AMIRNI';

        async function createHeaderImage(imagePath) {
            try {
                const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(imagePath) }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (e) {
                console.error(`Failed to load setlang image: ${imagePath}. Error: ${e.message}`);
                const fallbackPath = path.join(process.cwd(), 'media/hamza.jpg');
                try {
                    const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(fallbackPath) }, { upload: sock.waUploadToServer });
                    return imageMessage;
                } catch (err) {
                    return null;
                }
            }
        }

        const langCardsData = [
            {
                title: "اللغة العربية",
                body: "اختر اللغة العربية لتشغيل البوت باللغة الفصحى وبأزرار عربية بالكامل.",
                buttonText: "العربية 🇸🇦",
                id: ".setlang ar",
                img: path.join(process.cwd(), 'media/menu/bot_1.png')
            },
            {
                title: "English Language",
                body: "Select English to configure the bot with full English interface and menus.",
                buttonText: "English 🇺🇸",
                id: ".setlang en",
                img: path.join(process.cwd(), 'media/menu/bot_2.png')
            },
            {
                title: "الدارجة المغربية",
                body: "اختار الدارجة المغربية باش يولي البوت يهضر معاك بالدارجة المغربية ويصيفط ليك الميساجات بالدارجة.",
                buttonText: "الدارجة 🇲🇦",
                id: ".setlang ma",
                img: path.join(process.cwd(), 'media/menu/bot_3.png')
            }
        ];

        let cards = [];
        for (let lCard of langCardsData) {
            const imageMessage = await createHeaderImage(lCard.img);
            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: lCard.body }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `乂 ${botName} 🌐` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: lCard.title,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: lCard.buttonText, id: lCard.id })
                        }
                    ]
                })
            });
        }

        const msgContent = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `👋 *Welcome to ${botName}*\n\n` +
                                `🌍 Please select your preferred language below:\n` +
                                `🌍 المرجو اختيار لغتك المفضلة أسفله:\n\n` +
                                `⬅️ Swipe left to see options\n` +
                                `⬅️ اسحب لليمين أو اليسار لرؤية اللغات`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName} 2026` }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards: cards })
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
