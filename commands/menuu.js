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


        // 2. Define Category Mappings
        const catMap = {
            'new': ['qwen', 'edit', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
            'deen': ['quran', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen'],
            'download': ['facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'github', 'play', 'song', 'video', 'ytplay', 'yts', 'apk'],
            'ai': ['gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'remini', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'removebg', 'brat-vd'],
            'group': ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink'],
            'tools': ['sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'lyrics', 'calc', 'img-blur', 'translate', 'readviewonce', 'upload'],
            'news': ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes'],
            'daily': ['daily', 'top', 'shop', 'gamble', 'slots', 'profile'],
            'fun': ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper'],
            'game': ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia'],
            'economy': ['profile', 'daily', 'top', 'shop', 'gamble', 'slots'],
            'general': ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu'],
            'owner': ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall']
        };

        const cmdIcons = {
            'genai': '🎨', 'edit': '�', 'banana-ai': '🍌', 'ghibli': '🎭', 'tomp3': '🎵', 'apk': '📱', 'apk2': '🚀', 'apk3': '🔥', 'simp': '💘',
            'quran': '📖', 'salat': '🕌', 'prayertimes': '🕋', 'adhan': '📢', 'hadith': '📚', 'asmaa': '✨', 'azkar': '📿', 'qibla': '🧭', 'ad3iya': '🤲', 'deen': '🕌',
            'facebook': '🔵', 'instagram': '�', 'tiktok': '🎵', 'youtube': '🎬', 'mediafire': '📂', 'play': '🎧', 'song': '🎶', 'video': '🎥',
            'gpt': '🤖', 'gemini': '♊', 'deepseek': '🧠', 'imagine': '🖼️', 'aiart': '🌟', 'ghibli-art': '🎨', 'remini': '✨', 'qwen': '🦄', 'gemini-analyze': '🔍',
            'kick': '�', 'promote': '🆙', 'demote': '⬇️', 'tagall': '📢', 'hidetag': '👻', 'mute': '🔇', 'unmute': '🔊', 'close': '🔒', 'open': '🔓',
            'sticker': '🖼️', 'translate': '🗣️', 'ocr': '🔍', 'qrcode': '🏁', 'weather': '🌦️', 'lyrics': '📜', 'calc': '🔢',
            'menugame': '🎮', 'quiz': '🧠', 'riddle': '🧩', 'joke': '🤣', 'meme': '🐸', 'truth': '💡', 'dare': '🔥',
            'profile': '�', 'daily': '💰', 'top': '🏆', 'shop': '🛒',
            'alive': '🟢', 'ping': '⚡', 'owner': '👑', 'help': '❓'
        };


        const requested = args[0] ? args[0].toLowerCase() : null;

        // Arabic Aliases Map (Mapping English Command -> Arabic Alias) - MOVED OUTSIDE IF BLOCK
        const arCmds = {
            // AI Commands
            'gpt': 'ذكاء', 'gpt4': 'ذكاء4', 'gpt4o': 'ذكاء-برو', 'gpt4om': 'ذكاء-ميني', 'gpt3': 'ذكاء3', 'o1': 'ذكاء-متقدم',
            'gemini': 'جيميني', 'gemini-analyze': 'تحليل-صور', 'deepseek': 'بحث-عميق',
            'imagine': 'تخيل', 'aiart': 'رسم', 'genai': 'توليد-صور', 'nanobanana': 'نانو', 'banana-ai': 'موز',
            'ghibli': 'جيبلي', 'ghibli-art': 'فن-جيبلي', 'faceswap': 'تبديل-وجه',
            'ai-enhance': 'تحسين', 'colorize': 'تلوين', 'remini': 'ريميني', 'unblur': 'توضيح',
            'vocalremover': 'عزل-صوت', 'musicgen': 'توليد-موسيقى', 'removebg': 'حذف-خلفية',
            'qwen': 'كوين', 'miramuse': 'ميرا', 'edit': 'تعديل',

            // Islamic Commands
            'quran': 'قرآن', 'salat': 'صلاة', 'prayertimes': 'مواقيت', 'adhan': 'أذان',
            'hadith': 'حديث', 'ad3iya': 'أدعية', 'azkar': 'أذكار', 'qibla': 'قبلة',
            'tafsir': 'تفسير', 'surah': 'سورة', 'ayah': 'آية', 'dua': 'دعاء',
            'asmaa': 'أسماء-الله', 'fadlsalat': 'فضل-صلاة', 'hukm': 'حكم', 'qiyam': 'قيام',
            'danb': 'ذنب', 'nasiha': 'نصيحة', 'tadabbur': 'تدبر', 'sahaba': 'صحابة',
            'faida': 'فائدة', 'hasanat': 'حسنات', 'jumaa': 'جمعة', 'hajj': 'حج',
            'sira': 'سيرة', 'mawt': 'موت', 'shirk': 'شرك', 'hub': 'حب', 'deen': 'دين',

            // Download Commands
            'facebook': 'فيسبوك', 'instagram': 'انستا', 'youtube': 'يوتيوب', 'tiktok': 'تيكتوك',
            'mediafire': 'ميديافاير', 'play': 'شغل', 'song': 'أغنية', 'video': 'فيديو',
            'yts': 'بحث-يوتيوب', 'ytplay': 'تشغيل', 'apk': 'تطبيق', 'apk2': 'تطبيق2', 'apk3': 'تطبيق3',
            'github': 'جيتهاب',

            // Tools Commands
            'sticker': 'ستيكر', 'translate': 'ترجمة', 'weather': 'طقس', 'calc': 'حساب',
            'pdf2img': 'صور-بي-دي-اف', 'ocr': 'استخراج-نص', 'tts': 'نطق', 'qrcode': 'كود-كيو-آر',
            'screenshot': 'سكرين', 'ss': 'لقطة', 'tomp3': 'صوت', 'toimage': 'صورة',
            'tovideo': 'فيديو', 'togif': 'جيف', 'attp': 'نص-متحرك', 'ttp': 'نص-ملون',
            'lyrics': 'كلمات', 'upload': 'رفع', 'readviewonce': 'قراءة-مرة',
            'img-blur': 'طمس', 'say': 'قول', 'sticker-alt': 'ستيكر2',

            // Group Commands
            'kick': 'طرد', 'promote': 'ترقية', 'demote': 'تخفيض', 'ban': 'حظر',
            'tagall': 'منشن', 'hidetag': 'اخفاء', 'mute': 'كتم', 'unmute': 'الغاء-كتم',
            'close': 'اغلاق', 'open': 'فتح', 'antilink': 'منع-روابط', 'warn': 'تحذير',
            'antibadword': 'منع-شتائم', 'welcome': 'ترحيب', 'goodbye': 'وداع',
            'groupinfo': 'معلومات-مجموعة', 'staff': 'طاقم', 'delete': 'حذف',
            'warnings': 'تحذيرات',

            // Fun Commands
            'joke': 'نكتة', 'fact': 'حقيقة', 'quote': 'اقتباس', 'meme': 'ميم',
            'truth': 'صراحة', 'dare': 'تحدي', 'ship': 'توافق', 'ngl': 'صراحة-مجهولة',
            '4kwallpaper': 'خلفيات', 'character': 'شخصية', 'goodnight': 'نعاس',
            'stupid': 'مكلخ', 'flirt': 'غزل', 'compliment': 'مدح', 'insult': 'سب',

            // Game Commands
            'menugame': 'قائمة-ألعاب', 'xo': 'اكس-او', 'tictactoe': 'اكس-او',
            'rps': 'حجر-ورقة', 'math': 'رياضيات', 'guess': 'تخمين', 'scramble': 'خلط-كلمات',
            'riddle': 'لغز', 'quiz': 'مسابقة', 'love': 'حب', 'hangman': 'مشنقة',
            'trivia': 'ثقافة', 'eightball': 'كرة-سحرية', 'guesswho': 'شكون-انا',

            // Economy Commands
            'profile': 'بروفايل', 'daily': 'يومي', 'top': 'ترتيب', 'shop': 'متجر',
            'gamble': 'قمار', 'slots': 'ماكينة', 'blackjack': 'بلاك-جاك',

            // General Commands
            'ping': 'بينغ', 'owner': 'المالك', 'help': 'مساعدة', 'alive': 'حي',
            'system': 'نظام', 'setlang': 'لغة', 'script': 'سكريبت', 'allmenu': 'كل-الأوامر',

            // Owner Commands
            'mode': 'وضع', 'devmsg': 'بث', 'pmblocker': 'حظر-خاص', 'anticall': 'منع-مكالمات',
            'backup': 'نسخة-احتياطية', 'unban': 'الغاء-حظر', 'block': 'بلوك', 'unblock': 'فك-بلوك',
            'cleartmp': 'مسح-مؤقت', 'sudo': 'مشرف', 'clear': 'مسح', 'clearsession': 'مسح-جلسة',
            'autoreminder': 'تذكير-تلقائي',

            // News Commands
            'news': 'أخبار', 'akhbar': 'أخبار', 'football': 'كرة-قدم', 'kora': 'كورة',
            'taqes': 'طقس',

            // Other Commands
            'imdb': 'فيلم', 'resetlink': 'اعادة-رابط', 'hdvideo': 'فيديو-عالي',
            'winkvideo': 'وينك', 'brat-vd': 'برات', 'car': 'سيارة', 'recipe': 'وصفة',
            'currency': 'صرف', 'alloschool': 'مدرسة', 'checkimage': 'فحص-صورة',
            'pdf': 'بي-دي-اف', 'google': 'جوجل', 'wiki': 'ويكي'
        };

        const arDescs = {
            // AI
            'gpt': 'للدردشة مع الذكاء الاصطناعي', 'gpt4o': 'أحدث نموذج ذكاء اصطناعي برو', 'gpt4om': 'موديل ذكاء اصطناعي سريع خفيف',
            'gpt4': 'نموذج GPT-4 القوي', 'gpt3': 'نموذج GPT-3.5 الكلاسيكي', 'o1': 'نموذج ذكاء اصطناعي متطور جداً',
            'gemini': 'ذكاء اصطناعي من جوجل', 'imagine': 'توليد صور من النص',
            'gemini-analyze': 'تحليل ووصف الصور بدقة', 'deepseek': 'بحث معمق ومتقدم', 'remini': 'تحسين جودة الصور القديمة',
            'removebg': 'إزالة خلفية الصور بضغطة واحدة', 'colorize': 'تلوين الصور القديمة بالأبيض والأسود',
            'ghibli': 'تحويل الصور إلى نمط أنمي جيبلي', 'faceswap': 'تبديل الوجوه بين الصور',
            'ai-enhance': 'تحسين جودة الفيديو/الصور', 'vocalremover': 'فصل الصوت عن الموسيقى',
            // Deen
            'quran': 'قراءة القرآن الكريم', 'prayertimes': 'مواقيت الصلاة حسب مدينتك', 'azkar': 'أذكار المسلم اليومية',
            'ad3iya': 'أدعية مختارة من الكتاب والسنة', 'hadith': 'بحث في الأحاديث النبوية',
            'salat': 'تعليم كيفية الصلاة الصحيحة', 'adhan': 'سماع صوت الأذان العذب', 'asmaa': 'أسماء الله الحسنى ومعانيها',
            'qibla': 'تحديد اتجاه القبلة بدقة', 'tafsir': 'تفسير آيات القرآن الكريم', 'ayah': 'البحث عن آية قرآنية محددة',
            'jumaa': 'سنن وأذكار يوم الجمعة',
            // Download
            'facebook': 'تحميل فيديوهات من فيسبوك', 'instagram': 'تحميل ستوريات وفيديوهات انستا',
            'tiktok': 'تحميل فيديوهات تيك توك بدون علامة', 'youtube': 'تحميل من يوتيوب (صوت/فيديو)',
            'yts': 'بحث سريع في يوتيوب', 'mediafire': 'تحميل ملفات من ميديافاير',
            'apk': 'تحميل تطبيقات أندرويد (سريع)', 'apk2': 'تحميل تطبيقات (متجر كامل)', 'apk3': 'تحميل تطبيقات (رابط بديل)',
            // Tools
            'sticker': 'تحويل الصور/الفيديوهات لملصقات', 'translate': 'ترجمة النصوص لجميع اللغات',
            'calc': 'آلة حاسبة ذكية', 'ocr': 'استخراج النصوص من الصور',
            'weather': 'حالة الطقس اليوم وفي الأسبوع', 'lyrics': 'كلمات الأغاني المفضلة لديك', 'pdf2img': 'تحويل ملفات PDF إلى صور',
            'screenshot': 'أخذ لقطة شاشة لموقع معين', 'tts': 'تحويل النص إلى صوت مسموع', 'readviewonce': 'قراءة رسائل العرض لمرة واحدة',
            // Group
            'kick': 'طرد عضو من المجموعة', 'promote': 'ترقية عضو لمشرف', 'demote': 'إزالة مشرف من منصبه',
            'tagall': 'منشن لجميع أعضاء المجموعة', 'hidetag': 'منشن مخفي للجميع', 'antilink': 'منع الروابط في المجموعة',
            'close': 'إغلاق المجموعة للمشرفين فقط', 'open': 'فتح المجموعة للجميع',
            // Fun & Games
            'joke': 'نكت مغربية مضحكة', 'xo': 'لعب لعبة اكس او الشهيرة', 'quiz': 'اختبار ذكائك ومعلوماتك',
            'meme': 'صناعة ميمز مضحكة', 'truth': 'لعبة صراحة جريئة', 'dare': 'لعبة تحديات صعبة',
            'ship': 'قياس نسبة الحب بين شخصين', '4kwallpaper': 'خلفيات عالية الجودة 4K',
            // News
            'news': 'آخر الأخبار العالمية والمحلية', 'football': 'نتائج ومواعيد مباريات اليوم',
            // General
            'alive': 'التأكد من أن البوت يعمل', 'ping': 'سرعة استجابة البوت', 'owner': 'التواصل مع مطور البوت',
            // Owner
            'mode': 'تغيير وضع البوت (عام/خاص)', 'ban': 'حظر مستخدم من البوت', 'pmblocker': 'تفعيل حماية الخاص'
        };

        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        const sendMenu = async (text, headerTitle = "Hamza Amirni Bot") => {
            const footerBranding = `\n\n🛡️ *${botName.toUpperCase()}* 🛡️\n📢 *قناتنا:* ${settings.officialChannel}`;
            const fullText = text + footerBranding;

            if (thumbBuffer) {
                // Send standard Image Message (Most Reliable)
                await sock.sendMessage(chatId, {
                    image: thumbBuffer,
                    caption: fullText,
                    contextInfo: {
                        mentionedJid: [chatId],
                        isForwarded: true,
                        forwardingScore: 999
                    }
                }, { quoted: msg });
            } else {
                // Text Fallback with Link Preview
                await sock.sendMessage(chatId, {
                    text: fullText,
                    contextInfo: {
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
                    }
                }, { quoted: msg });
            }
        };

        // --- SUBMENU HANDLER ---
        if (requested) {
            // Check alias maps
            const categoryAliases = {
                'ai': 'ai', 'ذكاء': 'ai',
                'islam': 'deen', 'دين': 'deen', 'islamic': 'deen',
                'download': 'download', 'تحميل': 'download',
                'tools': 'tools', 'services': 'tools', 'أدوات': 'tools',
                'fun': 'fun', 'ضحك': 'fun', 'ترفيه': 'fun',
                'game': 'game', 'games': 'game', 'ألعاب': 'game',
                'news': 'news', 'أخبار': 'news',
                'owner': 'owner', 'مطور': 'owner',
                'group': 'group', 'مجموعات': 'group',
                'economy': 'economy', 'اقتصاد': 'economy', 'bank': 'economy'
            };

            let selectedKey = categoryAliases[requested] || (catMap[requested] ? requested : null);


            // Check if it's a specific command help request
            if (commands.has(requested) || (commands.has(requested) === false && requested)) {
                // Check aliases in handler if possible, but here we only have 'commands' map. 
                // We can roughly check if it's a command.
                if (commands.has(requested)) {
                    // It is a command
                    try {
                        // We don't have t() here easily unless we require it, but we can just say "No description"
                        // Or we can try to get it if the command exports a description (some do)
                        // But sticking to simple is better for now.
                        const cmd = commands.get(requested);
                        const desc = "أمر متاح"; // Placeholder since we don't have translation loaded here same way

                        await sendMenu(
                            `💡 *معلومات عن الأمر:* \`${prefix}${requested}\`\n\n` +
                            `📝 *الشرح:* استخدم هذا الأمر للاستفادة من خدمات البوت.\n\n` +
                            `👤 *المطور:* حمزة اعمرني`
                            , `معلومات ${requested}`);
                        return;
                    } catch (e) { }
                }
            }

            if (selectedKey && catMap[selectedKey]) {
                const header = `*┏━━❰ ⚔️ ${botName.toUpperCase()} ⚔️ ❱━━┓*\n`;
                let menuText = header + `\n✨ *قسم: ${selectedKey.toUpperCase()}* ✨\n` + `─━━━━━━━━━━━━━━─\n\n`;

                catMap[selectedKey].forEach(cmd => {
                    const icon = cmdIcons[cmd] || '🔹';
                    // Show ONLY Arabic alias if available, otherwise show English command
                    const displayName = arCmds[cmd] ? arCmds[cmd] : cmd;
                    menuText += `${icon} *${prefix}${displayName}*\n`;
                });

                menuText += `\n─━━━━━━━━━━━━━━─\n` + `🔙 للرجوع: *.menu*`;
                return await sendMenu(menuText, `قسم ${selectedKey}`);
            }
        }

        // --- Execute Main Menu ---
        const bodyText =
            `╔═══════════════════════════╗\n` +
            `║   ⚔️ *${botName.toUpperCase()}* ⚔️   ║\n` +
            `╠═══════════════════════════╣\n` +
            `║ 👤 *المطور:* حمزة اعمرني\n` +
            `║ 📅 *التاريخ:* ${dateStr}\n` +
            `║ ⏰ *الوقت:* ${timeStr}\n` +
            `║ 🔥 *النشاط:* ${days}d ${hours}h ${minutes}m\n` +
            `║ 🤖 *الإصدار:* 2026.1.1\n` +
            `╚═══════════════════════════╝\n\n` +
            `✨ *━━━ قائمة الأوامر الكاملة ━━━* ✨\n\n`;

        let mainMenu = bodyText;

        const sections = [
            { key: 'new', title: '🚀 الجديد (Exclusive)' },
            { key: 'deen', title: '🕌 الركن الديني' },
            { key: 'ai', title: '🤖 الذكاء الاصطناعي' },
            { key: 'download', title: '📥 التحميلات' },
            { key: 'tools', title: '🛠️ الأدوات والخدمات' },
            { key: 'fun', title: '🤣 الترفيه والضحك' },
            { key: 'game', title: '🎮 الألعاب' },
            { key: 'group', title: '👥 إدارة المجموعات' },
            { key: 'news', title: '📰 الأخبار والرياضة' },
            { key: 'economy', title: '💰 الاقتصاد' },
            { key: 'general', title: '⚙️ النظام' },
            { key: 'owner', title: '👑 المطور فقط' }
        ];

        // Display commands grouped by sections (like allmenu) with brief descriptions
        let totalCmds = 0;
        sections.forEach(section => {
            const cmds = catMap[section.key];
            if (cmds && cmds.length > 0) {
                mainMenu += `\n┌─── ❰ ${section.title} ❱ ───┐\n`;

                cmds.forEach(cmd => {
                    if (!arCmds[cmd]) return; // ONLY show Arabic commands
                    const icon = cmdIcons[cmd] || '🔹';
                    const displayName = arCmds[cmd];
                    const desc = arDescs[cmd] ? ` - ${arDescs[cmd]}` : '';
                    mainMenu += `│ ${icon} *.${displayName}*${desc}\n`;
                    totalCmds++;
                });

                mainMenu += `└──────────────────┘\n`;
            }
        });

        mainMenu += `\n\n╭─────────────────────────╮\n`;
        mainMenu += `│ 💡 *كيفية الاستخدام:* │\n`;
        mainMenu += `│ اكتب النقطة (.) قبل الأمر │\n`;
        mainMenu += `│ مثال: *.ذكاء* أو *.قرآن* │\n`;
        mainMenu += `╰─────────────────────────╯\n\n`;
        mainMenu += `⚡ *عدد الأوامر:* ${totalCmds} أمر\n`;
        mainMenu += `🌟 *جميع الأوامر باللغة العربية*`;

        await sendMenu(mainMenu, `${botName} - القائمة الكاملة`);

    } catch (error) {
        console.error('Error in menuu command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء عرض القائمة.' });
    }
};
