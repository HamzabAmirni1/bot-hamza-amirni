const settings = require('../../settings');
const { t } = require('../../lib/language');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');

function runtime(seconds, lang = 'ar') {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);

    if (lang === 'en') {
        var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return dDisplay + hDisplay + mDisplay + sDisplay;
    } else {
        var dDisplay = d > 0 ? d + (d == 1 ? " يوم و " : " أيام و ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " ساعة و " : " ساعات و ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " دقيقة و " : " دقائق و ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " ثانية" : " ثواني") : "";
        return dDisplay + hDisplay + mDisplay + sDisplay;
    }
}

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const botName = settings.botName || 'HAMZA AMIRNI';
        const forcedLang = 'en'; // Force English for .menu
        const isArabic = false;
        const prefix = settings.prefix;

        // 1. Define Category Mappings
        const catMap = {
            'new': ['hl', 'img2video', 'pinterest', 'ramadan', 'khatm', 'ytmp4v3', 'qwen', 'nanobanana', 'edit', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
            'religion': ['ramadan', 'khatm', 'qurancard', 'quranmp3', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen'],
            'download': ['pinterest', 'ytmp4v3', 'facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'github', 'play', 'song', 'video', 'ytplay', 'yts', 'apk'],
            'ai': ['hl', 'img2video', 'gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'colorize-v2', 'upscale-hd', 'cloth-change', 'image2sketch', 'airbrush', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'brat-vd', 'removebg'],
            'group': ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink', 'schedule'],
            'tools': ['pdf2img', 'stt', 'sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'lyrics', 'calc', 'img-blur', 'blur', 'translate', 'readviewonce', 'upload'],
            'news': ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes'],
            'daily': ['daily', 'top', 'shop', 'gamble', 'slots', 'profile'],
            'fun': ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper'],
            'games': ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia'],
            'general': ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu'],
            'owner': ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall', 'admin', 'addsudo', 'delsudo', 'listadmin']
        };

        const arCmds = {
            'gpt': 'ذكاء', 'gpt4': 'ذكاء4', 'gpt4o': 'ذكاء-برو', 'gpt4om': 'ذكاء-ميني', 'gpt3': 'ذكاء3', 'o1': 'ذكاء-متقدم',
            'gemini': 'جيميني', 'gemini-analyze': 'تحليل-صور', 'deepseek': 'بحث-عميق',
            'imagine': 'تخيل', 'aiart': 'رسم', 'genai': 'توليد-صور', 'nanobanana': 'نانو', 'banana-ai': 'موز',
            'ghibli': 'جيبلي', 'ghibli-art': 'فن-جيبلي', 'faceswap': 'تبديل-وجه',
            'ai-enhance': 'تحسين', 'colorize': 'تلوين', 'colorize-v2': 'تلوين-برو', 'upscale-hd': 'تحسين-جودة', 'cloth-change': 'تغيير-ملابس', 'image2sketch': 'رسم-رصاص', 'airbrush': 'فن-الكرتون', 'remini': 'ريميني', 'unblur': 'توضيح',
            'vocalremover': 'عزل-صنت', 'musicgen': 'توليد-موسيقى', 'removebg': 'حذف-خلفية',
            'qwen': 'كوين', 'miramuse': 'ميرا', 'edit': 'تعديل',
            'quran': 'قرآن', 'salat': 'صلاة', 'prayertimes': 'مواقيت', 'adhan': 'أذان',
            'hadith': 'حديث', 'ad3iya': 'أدعية', 'azkar': 'أذكار', 'qibla': 'قبلة',
            'tafsir': 'تفسير', 'surah': 'سورة', 'ayah': 'آية', 'dua': 'دعاء',
            'asmaa': 'أسماء-الله', 'fadlsalat': 'فضل-صلاة', 'hukm': 'حكم', 'qiyam': 'قيام',
            'danb': 'ذنب', 'nasiha': 'نصيحة', 'tadabbur': 'تدبر', 'sahaba': 'صحابة',
            'faida': 'فائدة', 'hasanat': 'حسنات', 'jumaa': 'جمعة', 'hajj': 'حج',
            'sira': 'سيرة', 'mawt': 'موت', 'shirk': 'شرك', 'hub': 'حب', 'deen': 'دين',
            'quranmp3': 'قراء-القرآن', 'qurancard': 'آية-اليوم',
            'ramadan': 'رمضان', 'khatm': 'ختمة',
            'hl': 'تحليل-صور', 'img2video': 'تحويل-لفيديو',
            'facebook': 'فيسبوك', 'instagram': 'انستا', 'youtube': 'يوتيوب', 'tiktok': 'تيكتوك',
            'ytmp4v3': 'يوتيوب3', 'pinterest': 'بينترست',
            'mediafire': 'ميديافاير', 'play': 'شغل', 'song': 'أغنية', 'video': 'فيديو',
            'yts': 'بحث-يوتيوب', 'ytplay': 'تشغيل', 'apk': 'تطبيق', 'apk2': 'تطبيق2', 'apk3': 'تطبيق3',
            'github': 'جيتهاب',
            'sticker': 'ستيكر', 'translate': 'ترجمة', 'weather': 'طقس', 'calc': 'حساب',
            'pdf2img': 'صور-بي-دي-اف', 'ocr': 'استخراج-نص', 'tts': 'نطق', 'qrcode': 'كود-كيو-آر',
            'screenshot': 'سكرين', 'ss': 'لقطة', 'tomp3': 'صوت', 'toimage': 'صورة',
            'tovideo': 'فيديو', 'togif': 'جيف', 'attp': 'نص-متحرك', 'ttp': 'نص-ملون',
            'lyrics': 'كلمات', 'upload': 'رفع', 'readviewonce': 'قراءة-مرة', 'stt': 'كتابة-أوديو',
            'img-blur': 'طمس', 'blur': 'تعتيم', 'say': 'قول', 'sticker-alt': 'ستيكر2',
            'kick': 'طرد', 'promote': 'ترقية', 'demote': 'تخفيض', 'ban': 'حظر',
            'tagall': 'منشن', 'hidetag': 'اخفاء', 'mute': 'كتم', 'unmute': 'الغاء-كتم',
            'close': 'اغلاق', 'open': 'فتح', 'antilink': 'منع-روابط', 'warn': 'تحذير',
            'antibadword': 'منع-شتائم', 'welcome': 'ترحيب', 'goodbye': 'وداع',
            'groupinfo': 'معلومات-مجموعة', 'staff': 'طاقم', 'delete': 'حذف',
            'warnings': 'تحذيرات',
            'joke': 'نكتة', 'fact': 'حقيقة', 'quote': 'اقتباس', 'meme': 'ميم',
            'truth': 'صراحة', 'dare': 'تحدي', 'ship': 'توافق', 'ngl': 'صراحة-مجهولة',
            '4kwallpaper': 'خلفيات', 'character': 'شخصية', 'goodnight': 'نعاس',
            'stupid': 'مكلخ', 'flirt': 'غزل', 'compliment': 'مدح', 'insult': 'سب',
            'menugame': 'قائمة-ألعاب', 'xo': 'اكس-او', 'tictactoe': 'اكس-او',
            'rps': 'حجر-ورقة', 'math': 'رياضيات', 'guess': 'تخمين', 'scramble': 'خلط-كلمات',
            'riddle': 'لغز', 'quiz': 'مسابقة', 'love': 'حب', 'hangman': 'مشنقة',
            'trivia': 'ثقافة', 'eightball': 'كرة-سحرية', 'guesswho': 'شكون-انا',
            'profile': 'بروفايل', 'daily': 'يومي', 'top': 'ترتيب', 'shop': 'متجر',
            'gamble': 'قمار', 'slots': 'ماكينة', 'blackjack': 'بلاك-جاك',
            'ping': 'بينغ', 'owner': 'المالك', 'help': 'مساعدة', 'alive': 'حي',
            'system': 'نظام', 'setlang': 'لغة', 'script': 'سكريبت', 'allmenu': 'كل-الأوامر',
            'mode': 'وضع', 'devmsg': 'بث', 'pmblocker': 'حظر-خاص', 'anticall': 'منع-مكالمات',
            'backup': 'نسخة-احتياطية', 'unban': 'الغاء-حظر', 'block': 'بلوك', 'unblock': 'فك-بلوك',
            'cleartmp': 'مسح-مؤقت', 'sudo': 'مشرف', 'clear': 'مسح', 'clearsession': 'مسح-جلسة',
            'autoreminder': 'تذكير-تلقائي', 'admin': 'أدمن', 'addsudo': 'إضافة-مشرف', 'delsudo': 'حذف-مشرف', 'listadmin': 'قائمة-المشرفين', 'schedule': 'توقيت-المجموعة', 'autogroup': 'أوتو-قروب'
        };

        const catIcons = {
            'new': '🔥', 'religion': '🕌', 'download': '📥', 'ai': '🤖', 'group': '👥', 'tools': '🛠️',
            'news': '📡', 'daily': '💰', 'fun': '🎭', 'games': '🎮', 'general': '✨', 'owner': '👑'
        };

        const catImages = {
            'new': path.join(process.cwd(), 'media/menu/bot_1.png'),
            'religion': path.join(process.cwd(), 'media/menu/bot_2.png'),
            'download': path.join(process.cwd(), 'media/menu/bot_3.png'),
            'ai': path.join(process.cwd(), 'media/menu/bot_4.png'),
            'group': path.join(process.cwd(), 'media/menu/bot_1.png'),
            'tools': path.join(process.cwd(), 'media/menu/bot_2.png'),
            'news': path.join(process.cwd(), 'media/menu/bot_3.png'),
            'daily': path.join(process.cwd(), 'media/menu/bot_4.png'),
            'fun': path.join(process.cwd(), 'media/menu/bot_1.png'),
            'games': path.join(process.cwd(), 'media/menu/bot_2.png'),
            'general': path.join(process.cwd(), 'media/menu/bot_3.png'),
            'owner': path.join(process.cwd(), 'media/menu/bot_4.png')
        };

        const sections = ['new', 'religion', 'ai', 'download', 'tools', 'fun', 'games', 'group', 'news', 'daily', 'general', 'owner'];

        async function createHeaderImage(imagePath) {
            try {
                const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(imagePath) }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (e) {
                console.error(`Failed to load help image: ${imagePath}. Error: ${e.message}`);
                const fallbackPath = path.join(process.cwd(), 'media/hamza.jpg');
                try {
                    const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(fallbackPath) }, { upload: sock.waUploadToServer });
                    return imageMessage;
                } catch (err) {
                    return null;
                }
            }
        }

        let cards = [];
        for (let section of sections) {
            const title = t(`menu.categories.${section}`, {}, forcedLang);
            const cmds = catMap[section];
            const icon = catIcons[section] || '🔹';
            const imageUrl = catImages[section] || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop';

            let bodyText = `✨ *${icon} Section: ${title}* ✨\n\n`;
            cmds.forEach(cmd => {
                const displayName = (isArabic && arCmds[cmd]) ? arCmds[cmd] : cmd;
                const desc = t(`command_desc.${cmd}`, {}, forcedLang);
                const descText = desc.startsWith('command_desc.') ? '' : ` : _${desc}_`;
                bodyText += `▫️ *${prefix}${displayName}*${descText}\n`;
            });

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `乂 ${botName} 🧠` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: `قائمة ${title}`,
                    hasMediaAttachment: true,
                    imageMessage: await createHeaderImage(imageUrl)
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "My Channel 🔔", url: settings.officialChannel })
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "Instagram 📸", url: settings.instagram })
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "Facebook 📘", url: settings.facebookPage })
                        },
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: "Developer 👑", id: ".owner" })
                        }
                    ]
                })
            });
        }

        const time = moment.tz(settings.timezone || 'Africa/Casablanca').format('HH:mm:ss');
        const date = moment.tz(settings.timezone || 'Africa/Casablanca').format('DD/MM/YYYY');
        const uptime = runtime(process.uptime(), userLang);
        const pushname = msg.pushName || 'User';

        // Translation Labels
        const L_WELCOME = t('menu.welcome', {}, userLang);
        const L_BOTNAME = t('menu.bot_name', {}, userLang);
        const L_DEV = t('menu.developer', {}, userLang);
        const L_TIME = t('menu.time', {}, userLang);
        const L_UPTIME = t('menu.uptime', {}, userLang);
        const L_SWIPE = t('menu.swipe', {}, userLang);

        const helpMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `👋 *${L_WELCOME} ${pushname}*\n\n` +
                                `🤖 *${L_BOTNAME}:* ${isArabic ? 'حمزة اعمرني' : 'Hamza Amirni'}\n` +
                                `👑 *${L_DEV}:* حمزة اعمرني\n` +
                                `⏰ *${L_TIME}:* ${time}\n` +
                                `📅 *Date:* ${date}\n` +
                                `⏳ *${L_UPTIME}:* ${uptime}\n\n` +
                                `🔗 *Follow Me:*\n` +
                                `📸 *Insta:* ${settings.instagram}\n` +
                                `📘 *FB:* ${settings.facebookPage}\n` +
                                `👤 *Owner:* wa.me/${settings.ownerNumber[0]}\n\n` +
                                `*${L_SWIPE}*`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName} 2026` }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, helpMsg.message, { messageId: helpMsg.key.id });

    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: t('common.error', {}, userLang) });
    }
};

