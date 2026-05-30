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
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(process.cwd(), 'media/hamza.jpg');
        let imageMessage = null;
        try {
            const genImage = await generateWAMessageContent({ image: fs.readFileSync(imagePath) }, { upload: sock.waUploadToServer });
            imageMessage = genImage.imageMessage;
        } catch (e) {
            console.error("setlang: failed to load local banner image:", e);
        }

        const buttons = [
            {
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    display_text: "العربية 🇸🇦",
                    id: ".setlang ar"
                })
            },
            {
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    display_text: "English 🇺🇸",
                    id: ".setlang en"
                })
            },
            {
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    display_text: "الدارجة 🇲🇦",
                    id: ".setlang ma"
                })
            }
        ];

        const msgContent = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `👋 *Welcome to ${settings.botName}*\n\n` +
                                `🌍 Please choose your preferred language below:\n` +
                                `🌍 المرجو اختيار لغتك المفضلة أسفله:`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `乂 ${settings.botName} 🌐` }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: `🌐 Language Selection / اختيار اللغة`,
                            hasMediaAttachment: !!imageMessage,
                            imageMessage: imageMessage || undefined
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: buttons
                        })
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
