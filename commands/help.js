const settings = require('../settings');
const { t } = require('../lib/language');
const { sendWithChannelButton } = require('../lib/channelButton');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const commandList = Array.from(commands.keys()).sort();
        const prefix = settings.prefix;

        const requested = args[0] ? args[0].toLowerCase() : null;
        const islamicAliases = ['islam', 'islamic', 'deen', 'دين', 'ديني', 'اسلاميات', 'اسلام', 'religion'];
        const gameAliases = ['games', 'game', 'العاب', 'لعب', 'منيو_لعب', 'menugame'];
        const funAliases = ['fun', 'dahik', 'ضحك', 'ترفيه', 'نكت'];
        const downloadAliases = ['download', 'tahmilat', 'tahmil', 'تحميل', 'تيليشارجي'];
        const toolsAliases = ['tools', 'adawat', 'أدوات', 'وسائل', 'خدمات'];
        const ownerAliases = ['owner', 'molchi', 'mol-chi', 'المالك', 'المطور'];
        const generalAliases = ['general', '3am', 'عام', 'نظام', 'سيستم'];
        const allAliases = ['all', 'allmenu', 'listall', 'كامل', 'كلشي'];
        const aiAliases = ['ai', 'ذكاء', 'ذكاء_اصطناعي', 'robot', 'bot'];

        // 2. Define Category Mappings
        const catMap = {
            'new': ['qwen', 'edit', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
            'religion': ['quran', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen'],
            'download': ['facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'github', 'play', 'song', 'video', 'ytplay', 'yts'],
            'ai': ['gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'remini', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'removebg', 'brat-vd'],
            'group': ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink'],
            'tools': ['sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'lyrics', 'calc', 'img-blur', 'translate', 'readviewonce', 'upload'],
            'news': ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes'],
            'fun': ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper'],
            'games': ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia'],
            'economy': ['profile', 'daily', 'top', 'shop', 'gamble', 'slots'],
            'general': ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu'],
            'owner': ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall']
        };

        const cmdIcons = {
            'genai': '🎨', 'edit': '🪄', 'banana-ai': '🍌', 'ghibli': '🎭', 'tomp3': '🎵', 'apk': '📱', 'apk2': '🚀', 'apk3': '🔥', 'simp': '💘',
            'quran': '📖', 'salat': '🕌', 'prayertimes': '🕋', 'adhan': '📢', 'hadith': '📚', 'asmaa': '✨', 'azkar': '📿', 'qibla': '🧭', 'ad3iya': '🤲', 'deen': '🕌',
            'jumaa': '📆', 'hajj': '🕋', 'sira': '🕊️', 'mawt': '⏳', 'shirk': '🛡️', 'hub': '💞', 'jannah': '🌴', 'nar': '🔥', 'qabr': '⚰️', 'qiyama': '🌋',
            'facebook': '🔵', 'instagram': '📸', 'tiktok': '🎵', 'youtube': '🎬', 'mediafire': '📂', 'play': '🎧', 'song': '🎶', 'video': '🎥',
            'gpt': '🤖', 'gemini': '♊', 'deepseek': '🧠', 'imagine': '🖼️', 'aiart': '🌟', 'ghibli-art': '🎨', 'remini': '✨', 'qwen': '🦄', 'gemini-analyze': '🔍',
            'kick': '🚫', 'promote': '🆙', 'demote': '⬇️', 'tagall': '📢', 'hidetag': '👻', 'mute': '🔇', 'unmute': '🔊', 'close': '🔒', 'open': '🔓',
            'sticker': '🖼️', 'translate': '🗣️', 'ocr': '🔍', 'qrcode': '🏁', 'weather': '🌦️', 'lyrics': '📜', 'calc': '🔢',
            'game': '🎮', 'quiz': '🧠', 'riddle': '🧩', 'joke': '🤣', 'meme': '🐸', 'truth': '💡', 'dare': '🔥',
            'profile': '👤', 'daily': '💰', 'top': '🏆', 'shop': '🛒',
            'alive': '🟢', 'ping': '⚡', 'owner': '👑', 'help': '❓'
        };

        // 3. Runtime Stats & Thumbnail
        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);

        let thumbBuffer = null;
        try {
            // Try to resolve the path relative to the root or absolute
            let thumbPath = settings.botThumbnail;
            if (!path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', thumbPath);
            }
            if (fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            }
        } catch (e) { console.error('Error reading thumbnail:', e); }

        // Pretty Date Time
        const date = new Date();
        const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateString = date.toLocaleDateString('en-GB');

        const header =
            `┏━━━ ❰ *${t('common.botName', {}, userLang).toUpperCase()}* ❱ ━━━┓\n` +
            `┃ 🤵‍♂️ *Owner:* ${t('common.botOwner', {}, userLang)}\n` +
            `┃ 📆 *Date:* ${dateString}\n` +
            `┃ ⌚ *Time:* ${timeString}\n` +
            `┃ ⏳ *Uptime:* ${days}d ${hours}h ${minutes}m\n` +
            `┃ 🤖 *Ver:* ${settings.version || '2.0.0'}\n` +
            `┗━━━━━━━━━━━━━━━━━━┛\n\n`;

        // Interactive Send Function (Adapted from sendMangaListButtons structure)
        const sendInteractiveMenu = async ({ bodyText, title = "Menu", rows = [], footerText = "حمزة اعمرني" }) => {
            const sections = [{ title, rows }];

            // Prepare Media
            let media;
            try {
                const thumbPath = path.isAbsolute(settings.botThumbnail) ? settings.botThumbnail : path.join(__dirname, '..', settings.botThumbnail);
                const imageSource = thumbBuffer || (fs.existsSync(thumbPath) ? fs.readFileSync(thumbPath) : null);

                if (imageSource) {
                    media = await prepareWAMessageMedia(
                        { image: imageSource },
                        { upload: sock.waUploadToServer }
                    );
                }
            } catch (e) {
                console.error('Error preparing media:', e);
            }

            const buttons = rows.length > 0 ? [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: title,
                        sections
                    })
                }
            ] : [];

            // Add Official Channel link to text
            const fullBody = bodyText + `\n\n📢 *القناة الرسمية:*\n${settings.officialChannel}`;

            const interactiveMsg = generateWAMessageFromContent(
                chatId,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: {
                                header: {
                                    hasMediaAttachment: !!media,
                                    imageMessage: media ? media.imageMessage : null,
                                    title: "قائمة الأوامر",
                                    subtitle: "حمزة اعمرني",
                                    hasMediaAttachment: !!media
                                },
                                body: { text: fullBody },
                                footer: { text: footerText },
                                nativeFlowMessage: {
                                    buttons: buttons
                                }
                            }
                        }
                    }
                },
                { userJid: sock.user.id || sock.user.jid, quoted: msg }
            );

            return await sock.relayMessage(chatId, interactiveMsg.message, {
                messageId: interactiveMsg.key.id
            });
        };

        // Common Send Function with Image (Old style / Fallback)
        const sendMenu = async (text, title = "✨ Hamza Amirni Bot ✨") => {
            // Add channel link to the bottom of text
            const fullText = text + `\n\n📢 *القناة الرسمية:*\n${settings.officialChannel}`;

            if (thumbBuffer) {
                // Send as image with caption
                await sock.sendMessage(chatId, {
                    image: thumbBuffer,
                    caption: fullText
                }, { quoted: msg });
            } else {
                // Fallback to text only
                await sock.sendMessage(chatId, {
                    text: fullText
                }, { quoted: msg });
            }
        };

        // --- PRIORITY 1: Sub-Menu/Category Aliases ---
        if (requested) {
            // Global Redirect for .menu all
            if (allAliases.includes(requested)) {
                const allmenu = require('./allmenu');
                return await allmenu(sock, chatId, msg, args, commands, userLang);
            }

            // General Category fallback (if not caught by specific sub-menus)
            let selectedKey = null;
            if (catMap[requested]) selectedKey = requested;
            else if (funAliases.includes(requested)) selectedKey = 'fun';
            else if (downloadAliases.includes(requested)) selectedKey = 'download';
            else if (toolsAliases.includes(requested)) selectedKey = 'tools';
            else if (ownerAliases.includes(requested)) selectedKey = 'owner';
            else if (generalAliases.includes(requested)) selectedKey = 'general';

            if (selectedKey) {
                const catName = t(`menu.categories.${selectedKey}`, {}, userLang);
                let menuText = header + `┌─── ❰ *${catName.toUpperCase()}* ❱ ───┐\n\n`;

                // Special Note for Downloads
                if (selectedKey === 'download') {
                    menuText += `🚀 *ملاحظة:* البوت كيتيليشارجي تلقائياً من أي رابط (Insta, TikTok, FB, YouTube) غير صيفط الليان بوحدو!\n\n`;
                }

                const cmdRows = catMap[selectedKey].map(c => {
                    const icon = cmdIcons[c] || '▫️';
                    const desc = t(`command_desc.${c}`, {}, userLang);
                    const descText = desc.startsWith('command_desc.') ? '' : desc;
                    return {
                        title: `${prefix}${c}`,
                        description: descText,
                        id: `${prefix}${c}`
                    };
                });

                return await sendInteractiveMenu({
                    bodyText: menuText,
                    title: `أوامر ${catName}`,
                    rows: cmdRows
                });
            }

            // Islamic Sub-Menu
            if (islamicAliases.includes(requested)) {
                let islamicMenu = header + `┌─── ❰ *الموسوعة الإسلامية* ❱ ───┐\n\n` +
                    `📖 .quran : تلاوة القرآن\n` +
                    `💬 .tafsir : تفسير الآيات\n` +
                    `🕋 .prayertimes : أوقات الصلاة\n` +
                    `🕌 .fadlsalat : فضل صلاة\n` +
                    `📌 .hukm : حكم شرعي\n` +
                    `🌙 .qiyam : قيام الليل\n` +
                    `🔥 .danb : ذنب مهلك\n` +
                    `💡 .nasiha : نصيحة دينية\n` +
                    `✨ .sahaba : قصة صحابي\n` +
                    `📖 .qisas : قصص الأنبياء والعبر\n` +
                    `📚 .hadith_long : أحاديث نبوية وقصص\n` +
                    `✨ .sahaba_long : قصص الصحابة والتابعين\n\n` +
                    `└──────────────────────┘\n` +
                    `🔙 اكتب *.menu* للرجوع للقائمة.`;
                return await sendMenu(islamicMenu, "Islamic Menu");
            }
            // Games Sub-Menu
            if (gameAliases.includes(requested)) {
                let gameMenu = header + `┌─── ❰ *MEGA GAME MENU* ❱ ───┐\n\n` +
                    `🕹️ *ألعاب فردية:*\n` +
                    `🎲 .guess | 🤖 .rps | 🎰 .slots\n` +
                    `🧮 .math | 🧩 .riddle | 🤔 .truefalse\n\n` +
                    `🔥 *ألعاب جماعية:*\n` +
                    `❌ .xo | ❓ .quiz | ❤️ .love\n\n` +
                    `└──────────────────────┘\n` +
                    `🔙 اكتب *.menu* للرجوع للقائمة.`;
                return await sendMenu(gameMenu, "Game Menu");
            }

            // AI Sub-Menu
            if (aiAliases.includes(requested)) {
                let aiMenu = header + `┌─── ❰ *مركز الذكاء الاصطناعي* ❱ ───┐\n\n` +
                    `🤖 *ChatGPT (GPT-Bot):*\n` +
                    `▫️ .gpt4o : أقوى موديل (GPT-4o)\n` +
                    `▫️ .gpt4om : النسخة السريعة (4o-mini)\n` +
                    `▫️ .gpt4 : موديل الدقة (GPT-4)\n` +
                    `▫️ .gpt3 : موديل (GPT-3.5)\n` +
                    `▫️ .o1 : الموديل المفكر (O1)\n\n` +
                    `✨ *موديلات أخرى:*\n` +
                    `♊ .gemini : سول Gemini\n` +
                    `🔍 .gemini-analyze : حلل الصور\n` +
                    `🧠 .deepseek : أحدث موديل صيني\n` +
                    `🦄 .qwen : موديل علي بابا\n\n` +
                    `🎨 *عالم الإبداع والتوليد:*\n` +
                    `🖼️ .imagine : تخيل معايا (رسم)\n` +
                    `🌟 .aiart : فن واعر بالذكاء\n` +
                    `🎭 .ghibli-art : ستايل جيبلي\n` +
                    `📀 .hdvideo : وضح الفيديو 2K\n` +
                    `🖼️ .removebg : حيد الخلفية\n` +
                    `✨ .unblur : صفّي التصويرة\n` +
                    `🎙️ .vocalremover : عزل الصوت\n\n` +
                    `└──────────────────────┘\n` +
                    `🔙 اكتب *.menu* للرجوع للقائمة.`;
                return await sendMenu(aiMenu, "AI Menu");
            }

            // Individual Command Help
            if (commands.has(requested)) {
                const desc = t(`command_desc.${requested}`, {}, userLang);
                if (!desc.startsWith('command_desc.')) {
                    return await sendMenu(
                        `💡 *الأمر:* ${prefix}${requested}\n` +
                        `📝 *الشرح:* ${desc}\n` +
                        `🤖 *المطور:* ${settings.botOwner}`,
                        `Help: ${requested}`
                    );
                }
            }
        }

        // --- PRIORITY 3: General Category Display (Main Menu) ---
        let menuText = header +
            `🏰 *مرحباً بك في إمبراطورية الأوامر* 🏰\n` +
            `بوت شامل، ذكي، وسريع.. كلشي بين يديك! اختر القسم المناسب:\n\n`;

        const sectionDividers = {
            'new': '🚀 *الأقسام الأساسية (Hot)*',
            'religion': '🕌 *الركن الديني*',
            'download': '📥 *التحميلات (Downloads)*',
            'fun': '🤣 *الترفيه (Fun)*',
            'general': '⚙️ *النظام (System)*'
        };

        const categoryRows = [
            { title: "🚀 الأقسام الأساسية (Hot)", description: "أحدث الأوامر والإضافات", id: `${prefix}menu new` },
            { title: "🕌 الركن الديني", description: "قرآن، أحاديث، مواقيت الصلاة", id: `${prefix}menu deen` },
            { title: "🤖 الذكاء الاصطناعي", description: "ChatGPT, Gemini, DeepSeek", id: `${prefix}menu ai` },
            { title: "📥 التحميلات (Downloads)", description: "فيسبوك، انستا، يوتيوب، تيكتوك", id: `${prefix}menu tahmilat` },
            { title: "🛠️ الأدوات (Tools)", description: "ملصقات، ترجمة، OCR، تحويل", id: `${prefix}menu adawat` },
            { title: "🤣 الترفيه (Fun)", description: "نكت، ميمز، صراحة، تحدي", id: `${prefix}menu dahik` },
            { title: "🎮 الألعاب (Games)", description: "XO، مسابقات، ألعاب جماعية", id: `${prefix}menu game` },
            { title: "👥 المجموعات", description: "طرد، ترقية، منشن، حماية", id: `${prefix}menu group` },
            { title: "📰 الأخبار والرياضة", description: "أخبار، كرة قدم، طقس", id: `${prefix}menu news` },
            { title: "💰 الاقتصاد", description: "بروفايل، يومي، متجر", id: `${prefix}menu economy` },
            { title: "⚙️ النظام (System)", description: "بوت، بينغ، مطور، لغة", id: `${prefix}menu 3am` },
            { title: "👑 المالك (Owner)", description: "أوامر المطور فقط", id: `${prefix}menu molchi` },
            { title: "🌟 كل الأوامر", description: "عرض جميع أوامر البوت", id: `${prefix}menu all` }
        ];

        await sendInteractiveMenu({
            bodyText: menuText,
            title: "قائمة الأقسام 🏰",
            rows: categoryRows
        });

    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
};
