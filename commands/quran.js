const { sendWithChannelButton } = require('../lib/channelButton');
const axios = require('axios');
const { t } = require('../lib/language');
const settings = require('../settings');

const { getSurahNumber } = require('../lib/quranUtils');
const { setSession } = require('../lib/quranSession');

async function quranCommand(sock, chatId, msg, args, commands, userLang) {
    const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
    const fs = require('fs');
    const path = require('path');

    // If user provides arguments (e.g. .quran fatiha), show format selection card
    if (args.length > 0) {
        const query = args.join(' ').trim();
        const surahId = getSurahNumber(query);

        if (surahId) {
            const { showSurahFormatCard } = require('./quranmp3');
            return showSurahFormatCard(sock, chatId, msg, surahId);
        }
    }

    // --- Main Quran Carousel Menu ---
    try {
        const islamicImgPath = path.join(process.cwd(), 'media/menu/bot_2.png');
        const islamicUrl = 'https://images.unsplash.com/photo-1542834759-42935210967a?q=80&w=1000&auto=format&fit=crop';

        let imageMessage = null;
        try {
            if (fs.existsSync(islamicImgPath)) {
                const gen = await generateWAMessageContent({ image: fs.readFileSync(islamicImgPath) }, { upload: sock.waUploadToServer });
                imageMessage = gen.imageMessage;
            } else {
                const gen = await generateWAMessageContent({ image: { url: islamicUrl } }, { upload: sock.waUploadToServer });
                imageMessage = gen.imageMessage;
            }
        } catch (e) { }

        // Surahs List for the selector
        const surahsList = [
            "1. الفاتحة", "2. البقرة", "3. آل عمران", "4. النساء", "5. المائدة", "6. الأنعام", "7. الأعراف", "8. الأنفال",
            "9. التوبة", "10. يونس", "11. هود", "12. يوسف", "13. الرعد", "14. إبراهيم", "15. الحجر", "16. النحل",
            "17. الإسراء", "18. الكهف", "19. مريم", "20. طه", "21. الأنبياء", "22. الحج", "23. المؤمنون", "24. النور",
            "25. الفرقان", "26. الشعراء", "27. النمل", "28. القصص", "29. العنكبوت", "30. الروم"
        ];

        const createRows = (start, end) => {
            return surahsList.slice(start, end).map((s, i) => ({
                title: s,
                id: `${settings.prefix}quran ${start + i + 1}`
            }));
        };

        const listParams = {
            title: "اضغط لاختيار السورة",
            sections: [{
                title: "أوائل السور (المجموعة الأولى)",
                rows: createRows(0, 30)
            }]
        };

        const cards = [
            {
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `🕌 *إختر السورة الكريمة*\n\nتصفح القرآن الكريم كاملاً وقرأ سوره العظيمة مع التلاوة.\n\n▫️ ${settings.prefix}quran [إسم السورة]`
                }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: "📖 تصفح القرآن",
                    hasMediaAttachment: !!imageMessage,
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "single_select",
                            "buttonParamsJson": JSON.stringify(listParams)
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "المطور 👑", url: `https://wa.me/${settings.ownerNumber[0]}` })
                        }
                    ]
                })
            },
            {
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `🎧 *استماع لأفضل القراء*\n\nاستمع للقرآن الكريم بأصوات خاشعة لأشهر القراء في العالم الإسلامي.\n\n▫️ ${settings.prefix}quranmp3`
                }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: "🎧 أصوات القراء",
                    hasMediaAttachment: !!imageMessage,
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: "🕌 ذهاب للقراء", id: ".quranmp3" })
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "قناتي الرسمية 🔔", url: settings.officialChannel })
                        }
                    ]
                })
            },
            {
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `✨ *آية اليوم*\n\nاستلهم الحكمة والسكينة مع آية مختارة عشوائياً من الذكر الحكيم.\n\n▫️ ${settings.prefix}qurancard`
                }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: "✨ تدبر الآية",
                    hasMediaAttachment: !!imageMessage,
                    imageMessage: imageMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: "💡 آية اليوم", id: ".qurancard" })
                        },
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: "المطور 👑", id: ".owner" })
                        }
                    ]
                })
            }
        ];

        const menuMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `👋 مرحباً بك في *قسم القرآن الكريم*\n\nاستمتع بتجربة إيمانية متكاملة تشمل القراءة والاستماع والتدبر.\n\n📌 اختر من القائمة الجانبية ما تفضل.`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `乂 ${settings.botName}` }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, menuMsg.message, { messageId: menuMsg.key.id });
        await sock.sendMessage(chatId, { react: { text: "🕌", key: msg.key } });

    } catch (e) {
        console.error("Error in Quran Carousel:", e);
        await sock.sendMessage(chatId, { text: "❌ حدث خطأ في عرض القائمة." }, { quoted: msg });
    }
}

module.exports = quranCommand;
