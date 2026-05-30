const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { t, getUserLanguage } = require('./language');
const { isOwner } = require('./ownerCheck');
const { getBotMode } = require('../commands/owner/mode');
const { Antilink } = require('./antilink');
const { handleBadwordDetection } = require('./antibadword');
const { sendWithChannelButton } = require('./channelButton');

// --- COMPREHENSIVE ALIAS MAP ---
const aliasMap = {
    // Modes & Core
    'public': 'mode', 'self': 'mode', 'private': 'mode', 'mode': 'mode', 'groups': 'mode',
    'عام': 'mode', 'خاص': 'mode', 'مجموعات': 'mode', 'وضع': 'mode',
    'مساعدة': 'help', 'menu': 'help', 'قائمة': 'menuu', 'help': 'help', 'اوامر': 'menuu', 'menuu': 'menuu',
    'المالك': 'owner', 'owner': 'owner', 'المطور': 'owner',
    'بينغ': 'ping', 'ping': 'ping',
    'بوت': 'alive', 'alive': 'alive', 'حي': 'alive',
    'status': 'system', 'system': 'system', 'restart': 'system', 'reboot': 'system', 'نظام': 'system',
    'clearsession': 'clearsession', 'cs': 'clearsession', 'مسح_جلسة': 'clearsession', 'مسح-جلسة': 'clearsession',
    'admin': 'admin', 'أدمن': 'admin', 'ادمن': 'admin',
    'addsudo': 'addsudo', 'إضافة_مشرف': 'addsudo', 'اضافة_مشرف': 'addsudo',
    'delsudo': 'delsudo', 'حذف_مشرف': 'delsudo',
    'listadmin': 'listadmin', 'قائمة_المشرفين': 'listadmin', 'الأدمن': 'listadmin',

    // Admin & Group
    'طرد': 'kick', 'kick': 'kick', 'remove': 'kick',
    'ترقية': 'promote', 'promote': 'promote', 'admin': 'promote',
    'تخفيض': 'demote', 'demote': 'demote', 'unadmin': 'demote',
    'حظر': 'ban', 'ban': 'ban',
    'الغاء_الحظر': 'unban', 'الغاء-حظر': 'unban', 'فك_الحظر': 'unban', 'unban': 'unban',
    'بلوك': 'block', 'block': 'block', 'حظر-شخص': 'block',
    'الغاء_حظر': 'unblock', 'فك_حظر': 'unblock', 'unblock': 'unblock', 'فك-بلوك': 'unblock',
    'منشن': 'tagall', 'tagall': 'tagall',
    'اخفاء': 'hidetag', 'hidetag': 'hidetag',
    'مجموعة': 'group', 'group': 'group',
    'منع_روابط': 'antilink', 'منع-روابط': 'antilink', 'antilink': 'antilink',
    'schedule': 'schedule', 'autogroup': 'schedule', 'توقيت-المجموعة': 'schedule', 'جدولة': 'schedule',
    'warn': 'warn', 'تحذير': 'warn',
    'warnings': 'warnings', 'تحذيرات': 'warnings',
    'pmblocker': 'pmblocker', 'pmbloker': 'pmblocker', 'مانع_الخاص': 'pmblocker', 'حظر-خاص': 'pmblocker',
    'autoread': 'autoread', 'ar': 'autoread', 'قراءة_تلقائية': 'autoread',
    'أخبار': 'news', 'akhbar': 'news', 'news': 'news',
    'hmm': 'ghosttag', 'ghosttag': 'ghosttag', 'تاغ_مخفي': 'ghosttag',
    'anticall': 'anticall', 'منع_المكالمات': 'anticall', 'منع-مكالمات': 'anticall',
    'antidelete': 'antidelete', 'مانع_الحذف': 'antidelete',
    'mute': 'mute', 'كتم': 'mute',
    'unmute': 'unmute', 'الغاء-كتم': 'unmute',
    'close': 'close', 'اغلاق': 'close', 'إغلاق': 'close',
    'open': 'open', 'فتح': 'open',
    'antibadword': 'antibadword', 'منع-شتائم': 'antibadword',
    'welcome': 'welcome', 'ترحيب': 'welcome',
    'goodbye': 'goodbye', 'وداع': 'goodbye',
    'staff': 'staff', 'طاقم': 'staff',
    'delete': 'delete', 'حذف': 'delete',

    // AI Tools
    'ai': 'gpt', 'ia': 'gpt', 'gpt': 'gpt', 'gemini': 'gemini', 'ذكاء': 'gpt',
    'gpt4': 'gpt', 'ذكاء4': 'gpt',
    'gpt4o': 'gpt', 'ذكاء-برو': 'gpt', 'ذكاء_برو': 'gpt',
    'gpt4om': 'gpt', 'ذكاء-ميني': 'gpt', 'ذكاء_ميني': 'gpt',
    'gpt3': 'gpt', 'ذكاء3': 'gpt',
    'o1': 'gpt', 'ذكاء-متقدم': 'gpt', 'ذكاء_متقدم': 'gpt',
    'gemini-analyze': 'gemini-analyze', 'gemini-pro': 'gemini-analyze', 'جيميني-حلل': 'gemini-analyze', 'حلل': 'gemini-analyze', 'حلل-صور': 'gemini-analyze', 'تحليل': 'gemini-analyze', 'تحليل-صور': 'gemini-analyze',
    'deepseek': 'deepseek', 'بحث-عميق': 'deepseek', 'بحث_عميق': 'deepseek',
    'aiart': 'aiart', 'ذكاء_اصطناعي': 'aiart', 'فن-الذكاء': 'aiart',
    'genai': 'genai', 'generate': 'genai', 'توليد': 'genai', 'رسم': 'genai', 'صورة': 'genai', 'توليد-صور': 'genai',
    'imagine': 'imagine', 'تخيل': 'imagine',
    'upscale-hd': 'upscale-hd', 'upscale': 'upscale-hd', 'تحسين-جودة': 'upscale-hd', 'hd': 'upscale-hd',
    'cloth-change': 'cloth-change', 'بدل-لبس': 'cloth-change', 'تغيير-ملابس': 'cloth-change',
    'image2sketch': 'image2sketch', 'sketch': 'image2sketch', 'رسم-رصاص': 'image2sketch',
    'colorize-v2': 'colorize-v2', 'colorize2': 'colorize-v2', 'تلوين2': 'colorize-v2',
    'airbrush': 'airbrush', 'ايربروش': 'airbrush', 'فن-الكرتون': 'airbrush',
    'blur': 'blur', 'طمس': 'blur', 'ضباب': 'blur',
    'qwen': 'qwen', 'qwenai': 'qwen', 'كوين': 'qwen',
    'banana': 'banana-ai', 'banana-ai': 'banana-ai', 'موز': 'banana-ai',
    'edit': 'nanobanana', 'edite': 'nanobanana', 'تعديل': 'nanobanana',
    'ai-enhance': 'ai-enhance', 'enhance': 'ai-enhance', 'تحسين': 'ai-enhance',
    'colorize': 'colorize', 'talwin': 'colorize', 'تلوين': 'colorize',
    'ai-img-edit': 'ai-img-edit', 'تعديل-صور': 'ai-img-edit', 'img-edit': 'ai-img-edit',
    'remini': 'remini', 'تحسين_الصور': 'remini', 'ريميني': 'remini',
    'unblur': 'unblur', 'توضيح': 'unblur',
    'faceswap': 'faceswap', 'تبديل_الوجوه': 'faceswap', 'تبديل-وجه': 'faceswap',
    'ghibli': 'ghibli', 'ghibli-art': 'ghibli', 'جيبلي': 'ghibli', 'فن-جيبلي': 'ghibli',
    'aicheck': 'aicheck', 'aidetect': 'aicheck', 'كشف_الذكاء': 'aicheck',
    'waterbot': 'waterbot', 'waterai': 'waterbot', 'بوت_الماء': 'waterbot',
    'removebg': 'removebg', 'ازالة_الخلفية': 'removebg', 'إزالة_الخلفية': 'removebg', 'حذف-خلفية': 'removebg',
    'miramuse': 'miramuse', 'ميرا': 'miramuse',
    'musicgen': 'musicgen', 'توليد-موسيقى': 'musicgen',
    'hdvideo': 'hdvideo', 'فيديو-عالي': 'hdvideo',
    'winkvideo': 'winkvideo', 'وينك': 'winkvideo',
    'brat-vd': 'brat-vd', 'برات': 'brat-vd',
    'img2video': 'img2video', 'image2video': 'img2video', 'تحويل-فيديو': 'img2video', 'vgen': 'img2video',

    // Media & Editing
    'sticker': 'sticker', 'ستيكر': 'sticker', 's': 'sticker', 'gif': 'sticker', 'togif': 'sticker', 'ملصق': 'sticker',
    'toimage': 'simage', 'toimg': 'simage', 'convert': 'simage', 'لصورة': 'simage', 'لصوره': 'simage',
    'tomp3': 'tomp3', 'mp3': 'tomp3', 'صوت': 'tomp3',
    'tovideo': 'video', 'video': 'video', 'فيديو': 'video', 'vedio': 'video', 'védio': 'video', 'tomp4': 'video',
    'attp': 'attp', 'ttp': 'ttp', 'نص-متحرك': 'attp', 'نص-ملون': 'ttp',
    'vocalremover': 'vocalremover', 'hazf-sawt': 'vocalremover', '3azlsawt': 'vocalremover', 'عزل_صوت': 'vocalremover', 'عزل-صوت': 'vocalremover',
    'carbon': 'carbon',
    'screenshot': 'screenshot', 'سكرين': 'screenshot', 'ss': 'screenshot', 'لقطة': 'screenshot',
    'lyrics': 'lyrics', 'kalimat': 'lyrics', 'كلمات_الأغنية': 'lyrics', 'كلمات': 'lyrics',
    'img-blur': 'img-blur', 'طمس': 'img-blur',
    'say': 'say', 'قول': 'say',
    'sticker-alt': 'sticker-alt', 'ستيكر2': 'sticker-alt',

    // Downloaders
    'qurancard': 'qurancard', 'بطاقة-قرآن': 'qurancard', 'آية-اليوم': 'qurancard', 'اية-اليوم': 'qurancard',
    'quran': 'quranmp3', 'قرآن': 'quranmp3', 'قران': 'quranmp3', 'تلاوة': 'quranmp3',
    'tafsir': 'tafsir', 'تفسير': 'tafsir',
    'prayertimes': 'prayertimes', 'مواقيت': 'prayertimes', 'صلاة': 'prayertimes', 'أوقات': 'prayertimes', 'أوقات_الصلاة': 'prayertimes',
    'adhan': 'adhan', 'أذان': 'adhan', 'اذان': 'adhan',
    'ad3iya': 'ad3iya', 'أدعية': 'ad3iya', 'ادعية': 'ad3iya',
    'hadith': 'hadith', 'حديث': 'hadith',
    'azkar': 'azkar', 'أذكار': 'azkar',
    'qibla': 'qibla', 'قبلة': 'qibla',
    'sira': 'deen', 'سيرة': 'deen', 'السيرة': 'deen',
    'qisas': 'deen', 'قصص': 'deen', 'القصص': 'deen',
    'asmaa': 'asmaa', 'اسماء_الله': 'asmaa', 'أسماء_الله': 'asmaa',
    'ayah': 'ayah', 'آية': 'ayah', 'اية': 'ayah',
    'dua': 'dua', 'دعاء': 'dua',
    'surah': 'surah', 'سورة': 'surah',
    'mawt': 'deen', 'موت': 'deen',
    'shirk': 'deen', 'شرك': 'deen',
    'hub': 'deen', 'حب': 'deen',
    'deen': 'deen', 'دين': 'deen',
    'fadlsalat': 'deen', 'فضل-صلاة': 'deen',
    'hukm': 'deen', 'حكم': 'deen',
    'qiyam': 'deen', 'قيام': 'deen',
    'danb': 'deen', 'ذنب': 'deen',
    'nasiha': 'deen', 'نصيحة': 'deen',
    'tadabbur': 'deen', 'تدبر': 'deen',
    'sahaba': 'deen', 'صحابة': 'deen',
    'faida': 'deen', 'فائدة': 'deen',
    'hasanat': 'deen', 'حسنات': 'deen',
    'jumaa': 'deen', 'جمعة': 'deen',
    'hajj': 'deen', 'حج': 'deen',
    'khatm': 'khatm', 'ختمة': 'khatm', 'ختمه': 'khatm', 'قرآن-مشترك': 'khatm', 'ختمة-القرآن': 'khatm',

    // Social Downloaders
    'facebook': 'facebook', 'فيسبوك': 'facebook', 'فيس': 'facebook', 'فايسبوك': 'facebook',
    'instagram': 'instagram', 'انستا': 'instagram', 'انستكرام': 'instagram', 'انستغرام': 'instagram',
    'tiktok': 'tiktok', 'تيكتوك': 'tiktok', 'تيك': 'tiktok', 'تيك_توك': 'tiktok',
    'youtube': 'video', 'يوتيوب': 'video', 'فيديو': 'video', 'vedio': 'video', 'védio': 'video', 'tomp4': 'video',
    'mediafire': 'mediafire', 'ميديافاير': 'mediafire', 'ميديا_فاير': 'mediafire',
    'song': 'song', 'أغنية': 'song', 'music': 'song', 'اغنية': 'song',
    'play': 'play', 'شغل': 'play', 'play2': 'play2', 'تشغيل': 'play2', 'ytplay': 'ytplay',
    'yts': 'yts', 'بحث': 'yts', 'بحث-يوتيوب': 'yts',
    'pinterest': 'pinterest', 'بنترست': 'pinterest', 'pint': 'pinterest',
    'apk': 'apk', 'تطبيق': 'apk', 'apk2': 'apk2', 'apk3': 'apk3', 'تطبيقات': 'apk', 'تطبيق2': 'apk2', 'تطبيق3': 'apk3',
    'github': 'github', 'جيتهاب': 'github',
    'gitrepo': 'gitrepo', 'dlrepo': 'gitrepo', 'repodown': 'gitrepo', 'gitdl': 'gitrepo', 'clonerepo': 'gitrepo',
    'تحميل-مستودع': 'gitrepo', 'مستودع-github': 'gitrepo',
    'upload': 'upload', 'رفع': 'upload',
    'readviewonce': 'readviewonce', 'قراءة-مرة': 'readviewonce',
    'groupinfo': 'groupinfo', 'معلومات-مجموعة': 'groupinfo',
    'script': 'script', 'سكريبت': 'script',
    'addsudo': 'addsudo', 'إضافة-مشرف': 'addsudo',
    'delsudo': 'delsudo', 'حذف-مشرف': 'addsudo',
    'listadmin': 'listadmin', 'قائمة-المشرفين': 'listadmin',

    // Fun & Games
    'menugame': 'menugame', 'gamemenu': 'menugame', 'العاب': 'menugame', 'ألعاب': 'menugame', 'قائمة-ألعاب': 'menugame',
    'joke': 'joke', 'نكتة': 'joke', 'نكته': 'joke',
    'meme': 'meme', 'ميم': 'meme',
    'cat': 'cat', 'قط': 'cat', 'قطة': 'cat',
    'dog': 'dog', 'كلب': 'dog',
    'fact': 'fact', 'حقيقة': 'fact', 'معلومة': 'fact',
    'quote': 'quote', 'اقتباس': 'quote',
    'stupid': 'stupid', 'mklakh': 'stupid', 'مكلخ': 'stupid',
    'flirt': 'flirt', 'غزل': 'flirt',
    'eightball': 'eightball', 'حظ': 'eightball', 'توقع': 'eightball', 'كرة-سحرية': 'eightball',
    'compliment': 'compliment', 'مدح': 'compliment',
    'insult': 'insult', 'سب': 'insult', 'معيرة': 'insult',
    'hangman': 'hangman', 'مشنقة': 'hangman',
    'tictactoe': 'tictactoe', 'xo': 'tictactoe', 'ttt': 'tictactoe', 'اكس_او': 'tictactoe', 'اكس-او': 'tictactoe',
    'ship': 'ship', 'كوبل': 'ship', 'توافق': 'ship',
    'character': 'character', 'شخصية': 'character',
    'goodnight': 'goodnight', 'نعاس': 'goodnight', 'تصبح_على_خير': 'goodnight',
    'truth': 'truth', 'dare': 'dare', 'صراحة': 'truth', 'تحدي': 'dare',
    '4kwallpaper': '4kwallpaper', 'wallpaper4k': '4kwallpaper', 'خلفيات': '4kwallpaper',
    'ngl': 'ngl', 'صراحة-مجهولة': 'ngl',
    'rps': 'rps', 'حجر-ورقة': 'rps',
    'math': 'math', 'رياضيات': 'math',
    'guess': 'guess', 'تخمين': 'guess',
    'scramble': 'scramble', 'خلط-كلمات': 'scramble',
    'riddle': 'riddle', 'لغز': 'riddle',
    'quiz': 'quiz', 'مسابقة': 'quiz',
    'trivia': 'trivia', 'ثقافة': 'trivia',
    'guesswho': 'guesswho', 'whoami': 'guesswho', 'شكون_انا': 'guesswho', 'شكون': 'guesswho',

    // Leveling & Economy
    'بروفايل': 'profile', 'حسابي': 'profile', 'ملفي': 'profile', 'profile': 'profile', 'p': 'profile', 'my': 'profile',
    'يومي': 'daily', 'يومية': 'daily', 'daily': 'daily', 'bonus': 'daily',
    'ترتيب': 'top', 'اوائل': 'top', 'top': 'top', 'leaderboard': 'top', 'rank': 'top',
    'متجر': 'shop', 'محل': 'shop', 'shop': 'shop', 'store': 'shop', 'market': 'shop',
    'قمار': 'gamble', 'رهان': 'gamble', 'gamble': 'gamble', 'bet': 'gamble',
    'slots': 'slots', 'slot': 'slots', 'ماكينة': 'slots',
    'blackjack': 'blackjack', 'bj': 'blackjack', '21': 'blackjack', 'بلاك-جاك': 'blackjack',
    'level': 'profile', 'xp': 'profile', 'wallet': 'profile',

    // Education & Tools
    'translate': 'translate', 'tr': 'translate', 'ترجمة': 'translate',
    'setlang': 'setlang', 'لغة': 'setlang', 'لغه': 'setlang',
    'weather': 'weather', 'طقس': 'weather', 'الجو': 'weather',
    'google': 'google', 'g': 'google', 'غوغل': 'google', 'جوجل': 'google',
    'wiki': 'wiki', 'wikipedia': 'wiki', 'ويكيبيديا': 'wiki', 'ويكي': 'wiki',
    'calc': 'calc', 'حساب': 'calc', 'calculator': 'calc', 'حاسبة': 'calc',
    'alloschool': 'alloschool', 'alloschoolget': 'alloschool', 'مدرسة': 'alloschool',
    'tahlil-soura': 'checkimage', 'checkimage': 'checkimage', 'فحص-صورة': 'checkimage',
    'tts': 'tts', 'say': 'tts', 'نطق': 'tts', 'قول': 'tts',
    'pdf': 'pdf', 'كتاب': 'pdf', 'مستند': 'pdf', 'بي-دي-اف': 'pdf',
    'pdf2img': 'pdf2img', 'pdftoimg': 'pdf2img', 'pdf_to_img': 'pdf2img', 'pdf-img': 'pdf2img', 'صور-pdf': 'pdf2img', 'pdf-صور': 'pdf2img', 'صور_ملف': 'pdf2img', 'صور-بي-دي-اف': 'pdf2img',
    'stt': 'stt', 'transcribe': 'stt', 'تحويل_صوت': 'stt', 'كتابة-أوديو': 'stt', 'تفريغ': 'stt',
    'recipe': 'recipe', 'wasfa': 'recipe', 'وصفة': 'recipe',
    'car': 'car', 'sayara': 'car', 'سيارة': 'car',
    'currency': 'currency', 'sarf': 'currency', 'تحويل_عملات': 'currency', 'صرف': 'currency',
    'qr': 'qrcode', 'qrcode': 'qrcode', 'باركود': 'qrcode', 'كود-كيو-آر': 'qrcode',
    'ocr': 'ocr', 'استخراج_النص': 'ocr', 'استخراج-نص': 'ocr',
    'نانو': 'nanobanana', 'editimg': 'nanobanana', 'nanobanana': 'nanobanana',
    'سكرين': 'screenshot', 'screenshot': 'screenshot', 'ss': 'screenshot',
    'جيميني-حلل': 'gemini-analyze', 'gemini-analyze': 'gemini-analyze', 'gemini-pro': 'gemini-analyze',
    'menuu': 'menuu', 'menuar': 'menuu', 'menu-ar': 'menuu', 'اوامر': 'menuu', 'قائمة_اوامر': 'menuu',

    // Owner
    'devmsg': 'devmsg', 'broadcast': 'devmsg', 'bouth': 'devmsg', 'بث': 'devmsg',
    'getsession': 'getsession', 'session': 'getsession', 'كود-الجلسة': 'getsession', 'sessioncode': 'getsession',
    'veo3-prompt': 'veo3-prompt', 'veo-prompt': 'veo3-prompt',
    'newmenu': 'newmenu',
    'allmenu': 'allmenu', 'listall': 'allmenu', 'menuall': 'allmenu', 'all': 'allmenu', 'كل-الأوامر': 'allmenu',
    'sudo': 'sudo', 'مشرف': 'sudo',
    'clear': 'clear', 'مسح': 'clear',
    'cleartmp': 'cleartmp', 'مسح-مؤقت': 'cleartmp',
    'autoreminder': 'autoreminder', 'تذكير-تلقائي': 'autoreminder',
    'backup': 'backup', 'نسخة-احتياطية': 'backup',

    // News & Sports
    'news': 'news', 'أخبار': 'news', 'اخبار': 'news',
    'football': 'football', 'كرة-قدم': 'football', 'كورة': 'football', 'kora': 'football',
    'taqes': 'weather', 'طقس': 'weather',

    // Others
    'imdb': 'imdb', 'فيلم': 'imdb',
    'resetlink': 'resetlink', 'اعادة-رابط': 'resetlink',

    // Ramadan Pack
    'ramadan': 'ramadan', 'رمضان': 'ramadan', 'دعاء-رمضان': 'ramadan', 'نصيحة-رمضان': 'ramadan',

    // AI & Innovation
    'hl': 'hl', 'تحليل': 'hl', 'حلل': 'hl',
    'img2video': 'img2video', 'حول-فيديو': 'img2video',

    // New Downloaders
    'ytmp4v3': 'ytmp4v3', 'يوتيوب3': 'ytmp4v3',
    'pinterest': 'pinterest', 'بينترست': 'pinterest'
};

const commands = new Map();
const commandsPath = path.join(__dirname, '../commands');

// Simple Anti-Spam Map
const spamMap = new Map();
const SPAM_THRESHOLD = 4000; // 4 seconds between commands (Anti-Ban)

// Load commands from directory
// Helper to get all files recursively
const getAllFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(file));
        } else {
            results.push(file);
        }
    });
    return results;
};

// Load commands recursively (excluding silana subfolder)
const commandFiles = getAllFiles(commandsPath);
commandFiles.forEach(file => {
    if (file.endsWith('.js')) {
        const isSilana = file.replace(/\\/g, '/').includes('/commands/silana/');
        if (!isSilana) {
            const commandName = path.basename(file, '.js');
            try {
                commands.set(commandName, require(file));
            } catch (error) {
                console.error(`Error loading command ${commandName}:`, error);
            }
        }
    }
});

console.log(`✅ Loaded ${commands.size} native commands`);

// --- SILANA PLUGINS COMPATIBILITY BRIDGE & LOADER ---
function wrapSilanaPlugin(silanaHandler) {
    return async (sock, chatId, msg, args, commandsMap, userLang, match) => {
        const conn = sock;
        const m = msg;

        // --- ENHANCE MSG OBJECT (m) ---
        if (!m.reply) {
            m.reply = async (text, options = {}) => {
                try {
                    return await sock.sendMessage(chatId, { text, ...options }, { quoted: msg, ...options });
                } catch (e) {
                    console.error('[m.reply error]:', e);
                    return await sock.sendMessage(chatId, { text }, { quoted: msg });
                }
            };
        }

        // --- ENHANCE SOCK OBJECT (conn) ---
        if (!conn.getFile) {
            conn.getFile = async (PATH, saveToFile = false) => {
                const fs = require('fs');
                const axios = require('axios');
                const fileType = require('file-type');
                let res, filename;
                let data = Buffer.isBuffer(PATH) ? PATH 
                         : PATH instanceof ArrayBuffer ? Buffer.from(PATH) 
                         : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split(',')[1], 'base64') 
                         : /^https?:\/\//.test(PATH) ? await (async () => {
                               res = await axios.get(PATH, { responseType: 'arraybuffer' });
                               return Buffer.from(res.data);
                           })()
                         : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) 
                         : typeof PATH === 'string' ? Buffer.from(PATH) 
                         : Buffer.alloc(0);

                if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
                const type = await fileType.fromBuffer(data) || {
                    mime: 'application/octet-stream',
                    ext: '.bin'
                };
                if (data && saveToFile && !filename) {
                    const tempDir = path.join(__dirname, '../tmp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                    filename = path.join(tempDir, Date.now() + '.' + type.ext);
                    await fs.promises.writeFile(filename, data);
                }
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename).catch(() => {});
                    }
                };
            };
        }

        if (!conn.sendFile) {
            conn.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
                try {
                    const fileInfo = await conn.getFile(path, true);
                    let mtype = 'document';
                    if (/image/.test(fileInfo.mime)) mtype = 'image';
                    else if (/video/.test(fileInfo.mime)) mtype = 'video';
                    else if (/audio/.test(fileInfo.mime)) mtype = 'audio';

                    const message = {
                        caption,
                        ptt,
                        [mtype]: fileInfo.filename ? { url: fileInfo.filename } : fileInfo.data,
                        mimetype: options.mimetype || fileInfo.mime,
                        fileName: filename || fileInfo.filename?.split(/[/\\]/).pop() || 'file',
                        ...options
                    };

                    const result = await sock.sendMessage(jid, message, { quoted, ...options });
                    if (fileInfo.filename) await fileInfo.deleteFile();
                    return result;
                } catch (e) {
                    console.error('[conn.sendFile error]:', e);
                    return await sock.sendMessage(jid, { text: `[Media File Error]: ${e.message}` }, { quoted });
                }
            };
        }

        if (!conn.sendMessage) {
            conn.sendMessage = async (jid, content, options = {}) => {
                return await sock.sendMessage(jid, content, options);
            };
        }

        if (!conn.getName) {
            conn.getName = (jid) => {
                if (!jid) return '';
                return jid.split('@')[0];
            };
        }

        const extra = {
            conn,
            text: match,
            usedPrefix: settings.prefix,
            command: commandsMap.command || '',
            args,
            isGroup: chatId.endsWith('@g.us'),
            sender: msg.sender || '',
            fromMe: msg.fromMe || false,
        };

        try {
            await silanaHandler(m, extra);
        } catch (err) {
            console.error(`Error executing silana command ${commandsMap.command}:`, err);
            await m.reply(`❌ حدث خطأ أثناء تشغيل الأمر: ${err.message}`);
        }
    };
}

const silanaPath = path.join(__dirname, '../commands/silana');
if (fs.existsSync(silanaPath)) {
    const pluginFiles = getAllFiles(silanaPath);
    let loadedPluginsCount = 0;
    pluginFiles.forEach(file => {
        if (file.endsWith('.js')) {
            const pluginName = path.basename(file, '.js');
            try {
                const silanaHandler = require(file);
                // The required module could be a function directly, or an object (e.g. { default: ... }) due to ES module compilation
                const actualHandler = silanaHandler.default || silanaHandler;
                if (actualHandler && (typeof actualHandler === 'function' || actualHandler.command)) {
                    const wrapped = wrapSilanaPlugin(actualHandler);
                    
                    let cmds = [];
                    if (Array.isArray(actualHandler.command)) {
                        cmds = actualHandler.command;
                    } else if (actualHandler.command instanceof RegExp) {
                        cmds = [pluginName];
                    } else if (typeof actualHandler.command === 'string') {
                        cmds = [actualHandler.command];
                    } else {
                        cmds = [pluginName];
                    }
                    
                    cmds.forEach(cmd => {
                        const cleanCmd = cmd.replace(/^[!.\/]/, '').trim().toLowerCase();
                        // ONLY register if it does not collide with a native bot command
                        if (!commands.has(cleanCmd)) {
                            commands.set(cleanCmd, wrapped);
                        }
                    });
                    loadedPluginsCount++;
                }
            } catch (error) {
                console.error(`Error loading silana plugin ${pluginName}:`, error);
            }
        }
    });
    console.log(`🔌 Loaded ${loadedPluginsCount} Silana compatibility plugins! Total active commands: ${commands.size}`);
}

const { addUser } = require('./userLogger');

// Main message handler
async function handleMessage(sock, msg) {
    try {
        // Debug: Log that we received a message
        console.log('[Handler] 📨 Message received from:', msg.key.remoteJid);

        const senderId = msg.key.participant || msg.key.remoteJid;

        // Register user automatically
        try {
            // Updated to use the senderId directly for logging
            addUser({ id: senderId, name: msg.pushName || '' });
        } catch (e) {
            console.error('[Handler] Error in addUser:', e);
        }
        const messageType = Object.keys(msg.message || {})[0];
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // Get message text using the serialized smsg fields for better reliability
        let messageText = (msg.text || msg.body || '').trim();

        // 🔍 DEBUG LOG: See what the bot "sees"
        if (messageText) {
            const emoji = (msg.mtype.includes('Response') || msg.mtype.includes('Reply')) ? '🔘' : '📩';
            console.log(`[Handler] ${emoji} Final Text: "${messageText}" | Type: ${msg.mtype} | Chat: ${chatId}`);
        }

        // Check if message starts with prefix FIRST (before antilink)
        const isCommand = messageText.startsWith(settings.prefix);

        // --- LEVELING SYSTEM ---
        // --- LEVELING SYSTEM (DISABLED BY USER REQUEST) ---
        // try {
        //     const { addXp } = require('./leveling');
        //     // Give 10 XP per message (activity reward)
        //     const xpResult = addXp(senderId, 10);
        //
        //     if (xpResult.leveledUp) {
        //         const levelUpMsg = `🎉 *مبروك!* \n\n🆙 طلعتي لـ *Level ${xpResult.level}*\n💰 ربحتي مكافأة ديال الفلوس!`;
        //         await sock.sendMessage(chatId, { text: levelUpMsg }, { quoted: msg });
        //     }
        // } catch (e) {
        //     console.error('[Leveling] Error adding XP:', e);
        // }

        // Run Antilink and Antibadword checks for groups ONLY if it's NOT a command
        if (isGroup && !isCommand) {
            try {
                await Antilink(msg, sock);
                await handleBadwordDetection(sock, chatId, msg, messageText, senderId);
            } catch (e) {
                console.error('[Handler] Error in Group Protection hooks:', e);
            }
        }

        // --- GLOBAL FEATURES (Run on ALL messages) ---
        const isUserOwner = isOwner(msg);
        const { isBotAdmin } = require('./botAdmins');
        const { isSudo } = require('./sudoers');

        const isUserAdmin = isBotAdmin(senderId);
        const isUserSudo = isSudo(senderId);

        // 🚀 MODE CHECK (Bypass for owner, bot admins, and sudoers)
        let currentMode = 'public';
        try {
            currentMode = getBotMode() || 'public';
        } catch (e) { }

        if (currentMode === 'self' && !isUserOwner && !isUserAdmin && !isUserSudo) {
            return; // Ignore all in Self mode if not owner/admin/sudo
        }

        if (currentMode === 'groups' && !isGroup && !isUserOwner && !isUserAdmin && !isUserSudo) {
            return; // Ignore all in Private if in Groups mode and not owner/admin/sudo
        }

        // 1. PM Blocker Logic (STRICT: Blocks everything in PM except owner/admin/sudo)
        if (!isGroup && !msg.key.fromMe && !isUserOwner && !isUserAdmin && !isUserSudo) {
            try {
                const { readState } = require('../commands/group/pmblocker');
                const pmState = readState();
                if (pmState.enabled) {
                    console.log(`[PM Blocker] Intercepted message from ${senderId}`);
                    const { sendWithChannelButton } = require('./channelButton');

                    // Send warning message
                    await sendWithChannelButton(sock, chatId, pmState.message, msg);

                    // Block user immediately
                    await sock.updateBlockStatus(chatId, 'block');
                    console.log(`[PM Blocker] ✅ Blocked user: ${senderId}`);
                    return; // Stop ALL further processing
                }
            } catch (e) {
                console.error('[PM Blocker] Error:', e);
            }
        }

        // 🚀 ENFORCE LANGUAGE SELECTION ONCE 🚀
        const { getUser, setUserLanguage } = require('./userLogger');
        let userProfile = getUser(senderId);

        if (!msg.key.fromMe && (!userProfile || !userProfile.language)) {
            const cleanMsg = messageText.trim();
            const isLangChoice = ['1', '2', '3'].includes(cleanMsg);
            const isSetlangCommand = isCommand && (cleanMsg.toLowerCase().startsWith(`${settings.prefix}setlang`) || cleanMsg.toLowerCase().startsWith(`${settings.prefix}لغة`));

            if (isLangChoice) {
                const langMap = { '1': 'en', '2': 'ar', '3': 'ma' };
                const selectedLang = langMap[cleanMsg];
                setUserLanguage(senderId, selectedLang);
                if (!userProfile) addUser({ id: senderId, name: msg.pushName || '' });

                const confirmMsg = selectedLang === 'en'
                    ? `✅ Language set to English!\n\nType *.menu* to see all commands.`
                    : selectedLang === 'ar'
                        ? `✅ تم تعيين اللغة إلى العربية!\n\nاكتب *.menu* لعرض جميع الأوامر.`
                        : `✅ تم تعيين اللغة إلى الدارجة!\n\nكتب *.menu* باش تشوف جميع الأوامر.`;
                try { await sock.readMessages([msg.key]); } catch (e) { }
                await sock.sendMessage(chatId, { text: confirmMsg }, { quoted: msg });
                return; // Handled explicitly
            } else if (!isSetlangCommand && (!isGroup || isCommand || (messageText && messageText.match(/https?:\/\/[^\s]+/gi)))) {
                try {
                    const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
                    const fs = require('fs');
                    const path = require('path');

                    const imagePath = path.join(process.cwd(), 'media/hamza.jpg');
                    let imageMessage = null;
                    try {
                        const genImage = await generateWAMessageContent({ image: fs.readFileSync(imagePath) }, { upload: sock.waUploadToServer });
                        imageMessage = genImage.imageMessage;
                    } catch (e) {
                        console.error("handler welcome: failed to load local banner image:", e);
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
                                            `🌍 Please choose your preferred language below to continue:\n` +
                                            `🌍 المرجو اختيار لغتك المفضلة أسفله للمتابعة:`
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

                    try { await sock.readMessages([msg.key]); } catch (e) { }
                    await sock.relayMessage(chatId, msgContent.message, { messageId: msgContent.key.id });
                } catch (cardError) {
                    console.error("Error sending language carousel card:", cardError);
                    const welcomeMsg = `👋 *Welcome to ${settings.botName}*\n\n🌍 Please choose your language to continue:\n🌍 المرجو اختيار لغتك للمتابعة:\n\n1️⃣ *.setlang en* or just *1* (English)\n2️⃣ *.setlang ar* or just *2* (العربية)\n3️⃣ *.setlang ma* or just *3* (الدارجة)`;
                    try { await sock.readMessages([msg.key]); } catch (e) { }
                    await sock.sendMessage(chatId, { text: welcomeMsg }, { quoted: msg });
                }
                return; // BLOCK ANY FURTHER EXECUTION!
            }
        }

        // Check if message starts with prefix
        // 🚀 AUTO-DOWNLOAD LOGIC (No Prefix) 🚀
        if (!messageText.startsWith(settings.prefix)) {
            const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
            const links = messageText.match(urlRegex);

            if (links && links.length > 0) {
                const cleanText = links[0];
                let autoCommand = null;

                if (/(facebook\.com|fb\.watch|fb\.com)/i.test(cleanText)) {
                    autoCommand = 'facebook';
                } else if (/(youtube\.com|youtu\.be)/i.test(cleanText)) {
                    autoCommand = 'video';
                } else if (/(tiktok\.com)/i.test(cleanText)) {
                    autoCommand = 'tiktok';
                } else if (/(instagram\.com|threads\.net)/i.test(cleanText)) {
                    autoCommand = 'instagram';
                } else if (/(mediafire\.com)/i.test(cleanText)) {
                    autoCommand = 'mediafire';
                } else if (/(twitter\.com|x\.com)/i.test(cleanText)) {
                    autoCommand = 'twitter';
                } else if (/(pinterest\.com\/pin\/)/i.test(cleanText)) {
                    autoCommand = 'pinterestdl';
                } else if (/(capcut\.com)/i.test(cleanText)) {
                    autoCommand = 'capcut';
                } else if (/(reddit\.com)/i.test(cleanText)) {
                    autoCommand = 'reddit';
                } else if (/(likee\.video|likee\.com)/i.test(cleanText)) {
                    autoCommand = 'likee';
                } else if (/(snapchat\.com)/i.test(cleanText)) {
                    autoCommand = 'snapchat';
                } else if (/(aptoide\.com|uptodown\.com)/i.test(cleanText)) {
                    autoCommand = 'apk';
                }

                if (autoCommand) {
                    console.log(`[Auto-Downloader] Detected ${autoCommand} link from ${senderId}`);
                    const newText = `${settings.prefix}${autoCommand} ${cleanText}`;
                    messageText = newText;

                    if (msg.message.conversation) msg.message.conversation = newText;
                    else if (msg.message.extendedTextMessage) msg.message.extendedTextMessage.text = newText;
                }
            }
        }

        // 3. TicTacToe & Hangman Move Logic (No Prefix Required)
        try {
            const ttt = require('../commands/game/tictactoe');
            if (ttt && typeof ttt.handleMove === 'function') {
                const handled = await ttt.handleMove(sock, chatId, senderId, messageText.trim().toLowerCase());
                if (handled) return; // Stop if move was handled
            }

            const hangman = require('../commands/game/hangman');
            if (hangman && typeof hangman.handleMove === 'function') {
                const handled = await hangman.handleMove(sock, chatId, senderId, messageText.trim().toLowerCase());
                if (handled) return; // Stop if move was handled
            }
        } catch (e) {
            console.error('[Game Handler Error]:', e);
        }

        if (!messageText.startsWith(settings.prefix)) {
            // Check for PDF Session (Collecting Images)
            try {
                const pdfCommand = require('../commands/tools/pdf');
                if (pdfCommand && typeof pdfCommand.handleSession === 'function') {
                    await pdfCommand.handleSession(sock, msg, senderId);
                }
            } catch (e) { }

            // Check for APK Session (Numeric Choice)
            try {
                const apk2 = require('../commands/thmil/apk2');
                if (apk2 && typeof apk2.handleSession === 'function') {
                    // Force get userLang for the session handler
                    let slang = 'ar';
                    try { slang = await getUserLanguage(senderId); } catch (e) { }

                    const handled = await apk2.handleSession(sock, chatId, senderId, messageText.trim(), msg, slang);
                    if (handled) return; // Stop if selection was handled
                }
            } catch (e) { }

            // Numeric language selection removed (moved to top of execution)

            return;
        }


        // Parse command and arguments
        const args = messageText.slice(settings.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        commands.command = commandName; // Pass command name for compatibility

        // Anti-Spam Check (Bypass for owner/admin/sudo)
        const now = Date.now();
        const myBotNum = sock.user?.id?.split(':')[0] || 'bot';
        const spamKey = `${myBotNum}_${senderId}`;

        if (!isUserOwner && !isUserAdmin && !isUserSudo && spamMap.has(spamKey)) {
            const lastTime = spamMap.get(spamKey);
            if (now - lastTime < SPAM_THRESHOLD) {
                console.log(`[Anti-Spam] Blocking ${senderId} from frequent command: ${commandName}`);
                return; // Ignore if too fast for non-owners
            }
        }
        spamMap.set(spamKey, now);

        // Get user language
        let userLang = 'ar';
        try {
            userLang = await getUserLanguage(senderId);
        } catch (e) { }

        // Check if command exists
        if (!commands.has(commandName)) {
            // Comprehensive Alias Map for English & Arabic parity
            const actualCommandName = aliasMap[commandName];
            if (actualCommandName && commands.has(actualCommandName)) {
                console.log(`[Handler] 📌 Alias Found: "${commandName}" -> "${actualCommandName}" | Chat: ${chatId}`);
                const command = commands.get(actualCommandName);
                const match = args.join(' ');

                if (typeof command === 'function' || (command && typeof command.execute === 'function')) {
                    // 🛡️ ANTI-BAN: Simulate Typing
                    try {
                        await sock.sendPresenceUpdate('composing', chatId);
                        const randomDelay = Math.floor(Math.random() * 300) + 200; // 0.2 - 0.5 seconds delay (Faster)
                        await new Promise(resolve => setTimeout(resolve, randomDelay));
                        await sock.sendPresenceUpdate('paused', chatId);
                    } catch (e) { }

                    // 🔵 AUTO-READ (VU) SHOW BLUE TICKS
                    try {
                        await sock.readMessages([msg.key]);
                    } catch (e) { }

                    if (typeof command === 'function') {
                        console.log(`[Handler] Executing Aliased Function: ${actualCommandName}`);
                        await command(sock, chatId, msg, args, commands, userLang, match);
                    } else {
                        console.log(`[Handler] Executing Aliased Command Object: ${actualCommandName}`);
                        await command.execute(sock, chatId, msg, args, commands, userLang, match);
                    }
                }
                return;
            }


            console.log(`❌ Command not found: ${commandName}`);

            // Command not found - send helpful message to owner only
            if (isUserOwner) {
                await sendWithChannelButton(sock, chatId, `❌ *الأمر \`${settings.prefix}${commandName}\` غير موجود!*

📋 لعرض الأوامر المتاحة: *${settings.prefix}help*
⚔️ ${settings.botName}`, msg);
            }

            return;
        }

        // Execute command
        const command = commands.get(commandName);
        if (command) {
            console.log(`[Handler] 🚀 Found Command: "${commandName}" | Triggered by: ${senderId}`);
            // FIX: Ensure 'match' is passed as a string (args.join) to prevent .trim() errors
            const match = args.join(' ');

            // 🛡️ ANTI-BAN: Simulate Typing
            try {
                await sock.sendPresenceUpdate('composing', chatId);
                const randomDelay = Math.floor(Math.random() * 300) + 200; // 0.2 - 0.5 seconds delay (Faster)
                await new Promise(resolve => setTimeout(resolve, randomDelay));
                await sock.sendPresenceUpdate('paused', chatId);
            } catch (e) { }

            // 🔵 AUTO-READ (VU) SHOW BLUE TICKS
            try {
                await sock.readMessages([msg.key]);
            } catch (e) { }

            if (typeof command === 'function') {
                await command(sock, chatId, msg, args, commands, userLang, match);
            } else if (typeof command.execute === 'function') {
                await command.execute(sock, chatId, msg, args, commands, userLang, match);
            }
        } else {
            console.error(`Command ${commandName} is not a function or object with execute():`, typeof command);
        }

    } catch (error) {
        console.error('Error handling message:', error);
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: t('common.error', await getUserLanguage(msg.key.participant || msg.key.remoteJid))
            }, { quoted: msg });
        } catch (e) {
            console.error('Error sending error message:', e);
        }
    }
}

// Export the handler
module.exports = handleMessage;
