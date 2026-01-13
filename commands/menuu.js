const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const prefix = settings.prefix;
        const botName = settings.botName || 'حمزة اعمرني';

        // Runtime
        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);

        let thumbBuffer = null;
        try {
            let thumbPath = settings.botThumbnail;
            if (thumbPath && !path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', thumbPath);
            }
            if (thumbPath && fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            }
        } catch (e) { console.error('Error reading thumbnail:', e); }

        const date = new Date();
        const dateStr = date.toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

        const bodyText =
            `*┏━━❰ ⚔️ ${botName.toUpperCase()} ⚔️ ❱━━┓*\n` +
            `┃ 🤵‍♂️ *المطور:* حمزة اعمرني\n` +
            `┃ 📅 *التاريخ:* ${dateStr}\n` +
            `┃ ⌚ *الوقت:* ${timeStr}\n` +
            `┃ ⏳ *النشاط:* ${days}d ${hours}h ${minutes}m\n` +
            `┃ 🤖 *الإصدار:* 2026.1.1\n` +
            `*┗━━━━━━━━━━━━━━━━━━━┛*\n\n` +
            `اختر القسم لي بغيتي من اللائحة:`;

        const rows = [
            { title: "🚀 الجديد (Hot)", description: "أحدث الأوامر والإضافات", id: `${prefix}menu new` },
            { title: "🕌 الركن الديني", description: "قرآن، أحاديث، مواقيت الصلاة", id: `${prefix}menu deen` },
            { title: "🤖 الذكاء الاصطناعي", description: "ChatGPT, Gemini, DeepSeek", id: `${prefix}menu ai` },
            { title: "📥 التحميلات", description: "FB, Insta, YouTube, TikTok", id: `${prefix}menu tahmilat` },
            { title: "🛠️ الأدوات", description: "ستيكر، ترجمة، OCR، تحويل", id: `${prefix}menu adawat` },
            { title: "🤣 الترفيه", description: "نكت، ميمز، صراحة، تحدي", id: `${prefix}menu dahik` },
            { title: "🎮 الألعاب", description: "XO، مسابقات، ألعاب", id: `${prefix}menu game` },
            { title: "👥 المجموعات", description: "طرد، ترقية، حماية...", id: `${prefix}menu group` },
            { title: "📰 الأخبار والرياضة", description: "أخبار، كرة قدم، طقس", id: `${prefix}menu news` },
            { title: "💰 الاقتصاد", description: "بروفايل، يومي، متجر", id: `${prefix}menu economy` },
            { title: "⚙️ النظام", description: "بينغ، لغة، وضع...", id: `${prefix}menu 3am` },
            { title: "👑 المالك", description: "أوامر المطور فقط", id: `${prefix}menu molchi` }
        ];

        const sendListMenu = async () => {
            const fullBody = bodyText + `\n\n📢 *القناة:* ${settings.officialChannel}`;
            const sections = [
                {
                    title: "الأقسام",
                    rows: rows.map(r => ({
                        title: r.title,
                        description: r.description,
                        rowId: r.id
                    }))
                }
            ];

            return await sock.sendMessage(chatId, {
                text: fullBody,
                footer: "حمزة اعمرني",
                title: botName,
                buttonText: "اختار القسم 👇",
                sections
            }, { quoted: msg });
        };

        const sendInteractiveMenu = async () => {
            const fullBody = bodyText + `\n\n📢 *القناة:* ${settings.officialChannel}`;
            try {
                const sections = [{ title: "الأقسام", rows }];

                const imageSource = thumbBuffer || null;
                const media = imageSource ? await prepareWAMessageMedia(
                    { image: imageSource },
                    { upload: sock.waUploadToServer }
                ).catch(() => null) : null;

                const msgContent = {
                    viewOnceMessageV2: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: {
                                header: {
                                    title: botName,
                                    hasMediaAttachment: !!media,
                                    ...(media || {})
                                },
                                body: {
                                    text: fullBody
                                },
                                footer: {
                                    text: "حمزة اعمرني"
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: "single_select",
                                            buttonParamsJson: JSON.stringify({
                                                title: "اضغط لاختيار القسم 🏰",
                                                sections
                                            })
                                        },
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "كل الأوامر 📜",
                                                id: `${prefix}allmenu`
                                            })
                                        },
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "المطور 👑",
                                                id: `${prefix}owner`
                                            })
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };

                const userJid = sock.decodeJid(sock.user.id);
                const interactiveMsg = generateWAMessageFromContent(
                    chatId,
                    msgContent,
                    { userJid, quoted: msg }
                );

                return await sock.relayMessage(chatId, interactiveMsg.message, {
                    messageId: interactiveMsg.key.id
                });
            } catch (err) {
                return await sock.sendMessage(chatId, { text: fullBody }, { quoted: msg });
            }
        };

        try {
            await sendListMenu();
        } catch (e) {
            try {
                await sendInteractiveMenu();
            } catch (err) {
                const fullBody = bodyText + `\n\n📢 *القناة:* ${settings.officialChannel}`;
                await sock.sendMessage(chatId, { text: fullBody }, { quoted: msg });
            }
        }

    } catch (error) {
        console.error('Error in menuu command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء عرض القائمة.' });
    }
};
