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

        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        const sendMenu = async (text, headerTitle = "Hamza Amirni Bot") => {
            const footerBranding = `\n\n🛡️ *${botName.toUpperCase()}* 🛡️\n📢 *قناتنا:* ${settings.officialChannel}`;
            const fullText = text + footerBranding;

            const contextInfo = {
                mentionedJid: [chatId],
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: headerTitle,
                    body: "المطور: حمزة اعمرني",
                    thumbnail: thumbBuffer,
                    sourceUrl: settings.officialChannel,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            };

            if (thumbBuffer) {
                await sock.sendMessage(chatId, {
                    image: thumbBuffer,
                    caption: fullText,
                    contextInfo
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, {
                    text: fullText,
                    contextInfo
                }, { quoted: msg });
            }
        };

        // --- Execute Main Menu ---
        let mainMenu = bodyText + "\n\n" +
            `🚀 *${prefix}menu new* : الجديد (Hot)\n` +
            `🕌 *${prefix}menu deen* : الركن الإسلامي\n` +
            `🤖 *${prefix}menu ai* : الذكاء الاصطناعي\n` +
            `📥 *${prefix}menu download* : التحميلات\n` +
            `🛠️ *${prefix}menu tools* : الأدوات والخدمات\n` +
            `🤣 *${prefix}menu fun* : الترفيه والضحك\n` +
            `🎮 *${prefix}menu games* : قسم الألعاب\n` +
            `👥 *${prefix}menu group* : إدارة المجموعات\n` +
            `📰 *${prefix}menu news* : الأخبار والرياضة\n` +
            `💰 *${prefix}menu economy* : الاقتصاد (البنك)\n` +
            `⚙️ *${prefix}menu general* : نظام البوت\n` +
            `👑 *${prefix}menu owner* : قسم المطور\n` +
            `🌟 *${prefix}allmenu* : جميع الأوامر\n\n` +
            `💡 *نصيحة:* اكتب .menu متبوعاً باسم القسم (مثال: .menu ai)`;

        await sendMenu(mainMenu, `${botName} - القائمة الرئيسية`);

    } catch (error) {
        console.error('Error in menuu command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء عرض القائمة.' });
    }
};
