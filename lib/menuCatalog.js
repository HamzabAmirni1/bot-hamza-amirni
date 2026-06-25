const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '../commands');

/** Menu alias → native command file basename */
const MENU_ALIASES = {
    youtube: 'video',
    gpt4o: 'gpt', gpt4om: 'gpt', gpt4: 'gpt', gpt3: 'gpt', o1: 'gpt',
    xo: 'tictactoe',
    togif: 'sticker', toimage: 'simage', tovideo: 'video',
    'ghibli-art': 'ghibli',
    fadlsalat: 'deen', hukm: 'deen', qiyam: 'deen', danb: 'deen',
    nasiha: 'deen', tadabbur: 'deen', sahaba: 'deen', faida: 'deen',
    hasanat: 'deen', jumaa: 'deen', hajj: 'deen', sira: 'deen',
    mawt: 'deen', shirk: 'deen', hub: 'deen',
    group: 'groupinfo',
    taqes: 'weather',
    pin: 'pinterest',
    ytplay: 'play',
    song: 'play',
    facebook: 'facebook',
    instagram: 'instagram'
};

const RAW_CATEGORIES = {
    new: ['hl', 'img2video', 'pinterest', 'pinterestdl', 'ramadan', 'khatm', 'ytmp4v3', 'qwen', 'nanobanana', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
    religion: ['ramadan', 'khatm', 'qurancard', 'quranmp3', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen', 'deenquiz', 'kitab', 'quranpdf', 'quranread', 'tahlil-soura'],
    download: ['pinterest', 'pinterestdl', 'ytmp4v3', 'facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'gdrive', 'github', 'gitrepo', 'play', 'play2', 'song', 'song2', 'video', 'ytplay', 'yts', 'yts2', 'apk', 'apk2', 'apk3', 'capcut', 'f-droid', 'likee', 'live', 'qdl', 'reddit', 'snapchat', 'spotify', 'tahmil-app', 'twitter', 'ytdl', 'ytmp4', 'ytmp4v2'],
    ai: ['hl', 'img2video', 'gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'colorize-v2', 'upscale-hd', 'cloth-change', 'image2sketch', 'airbrush', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'brat-vd', 'removebg', 'veo-prompt', 'veo3-prompt', 'waterai', 'waterbot', 'banana-ai', 'nanobanana', 'genai'],
    group: ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink', 'schedule', 'anticall', 'antidelete', 'antigroupcall', 'autoread', 'autostatus', 'autowelcome', 'ghosttag', 'setpp', 'tag'],
    tools: ['pdf2img', 'stt', 'sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'screenshot', 'lyrics', 'calc', 'img-blur', 'blur', 'translate', 'readviewonce', 'upload', 'alloschool', 'carbon', 'carbonguide', 'checkimage', 'colorize', 'faceswap', 'gif', 'google', 'hazf-sawt', 'hdvideo', 'remind', 'remini', 'removebg', 'save', 'stickertelegram', 'take', 'textmaker', 'tomp3', 'trim', 'wiki'],
    news: ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes', 'aljazeera', 'alwadifa', 'hespress', 'maroc-flag'],
    daily: ['daily', 'top', 'shop', 'gamble', 'slots', 'profile'],
    fun: ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper', 'areact', 'cat', 'dog', 'eightball', 'flirt', 'ghibli', 'goodnight', 'insult', 'rate', 'simp', 'stupid', 'topmembers', 'wasted'],
    games: ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia', 'blackjack', 'emojigame', 'guesswho', 'kalimat', 'tictactoe', 'truefalse', 'werewolf'],
    general: ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu', 'menuu', 'msgtodev'],
    owner: ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall', 'addsudo', 'delsudo', 'listadmin', 'getsession', 'resetlink', 'upswgc']
};

let nativeCommandsCache = null;

function getNativeCommands() {
    if (nativeCommandsCache) return nativeCommandsCache;

    const names = new Set();
    const listDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) {
                if (full.replace(/\\/g, '/').includes('/commands/silana/')) continue;
                listDir(full);
            } else if (file.endsWith('.js')) {
                names.add(path.basename(file, '.js'));
            }
        }
    };

    listDir(COMMANDS_DIR);
    nativeCommandsCache = names;
    return names;
}

function resolveCommandName(name) {
    const native = getNativeCommands();
    if (native.has(name)) return name;
    const aliased = MENU_ALIASES[name];
    if (aliased && native.has(aliased)) return aliased;
    return null;
}

function isCommandAvailable(name) {
    return !!resolveCommandName(name);
}

function filterCategory(commands) {
    const seen = new Set();
    const out = [];
    for (const cmd of commands) {
        const resolved = resolveCommandName(cmd);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        out.push(cmd);
    }
    return out;
}

function getMenuCategories() {
    const filtered = {};
    for (const [cat, cmds] of Object.entries(RAW_CATEGORIES)) {
        filtered[cat] = filterCategory(cmds);
    }
    return filtered;
}

const arCmds = {
    gpt: 'ذكاء', gpt4: 'ذكاء4', gpt4o: 'ذكاء-برو', gpt4om: 'ذكاء-ميني', gpt3: 'ذكاء3', o1: 'ذكاء-متقدم',
    gemini: 'جيميني', 'gemini-analyze': 'تحليل-صور', deepseek: 'بحث-عميق',
    imagine: 'تخيل', aiart: 'رسم', genai: 'توليد-صور', nanobanana: 'نانو', 'banana-ai': 'موز',
    ghibli: 'جيبلي', 'ghibli-art': 'فن-جيبلي', faceswap: 'تبديل-وجه',
    'ai-enhance': 'تحسين', colorize: 'تلوين', 'colorize-v2': 'تلوين-برو', 'upscale-hd': 'تحسين-جودة',
    'cloth-change': 'تغيير-ملابس', image2sketch: 'رسم-رصاص', airbrush: 'فن-الكرتون', remini: 'ريميني', unblur: 'توضيح',
    vocalremover: 'عزل-صوت', musicgen: 'توليد-موسيقى', removebg: 'حذف-خلفية',
    qwen: 'كوين', miramuse: 'ميرا',
    quranmp3: 'قراء-القرآن', qurancard: 'آية-اليوم',
    ramadan: 'رمضان', khatm: 'ختمة',
    hl: 'تحليل-صور', img2video: 'تحويل-لفيديو',
    facebook: 'فيسبوك', instagram: 'انستا', youtube: 'يوتيوب', tiktok: 'تيكتوك',
    ytmp4v3: 'يوتيوب3', pinterest: 'بينترست', pinterestdl: 'تحميل-بينترست',
    mediafire: 'ميديافاير', play: 'شغل', song: 'أغنية', video: 'فيديو',
    yts: 'بحث-يوتيوب', ytplay: 'تشغيل', apk: 'تطبيق', apk2: 'تطبيق2', apk3: 'تطبيق3',
    github: 'جيتهاب', gitrepo: 'تحميل-مستودع',
    sticker: 'ستيكر', translate: 'ترجمة', weather: 'طقس', calc: 'حساب',
    'pdf2img': 'صور-بي-دي-اف', ocr: 'استخراج-نص', tts: 'نطق', qrcode: 'كود-كيو-آر',
    screenshot: 'سكرين', ss: 'لقطة', tomp3: 'صوت', toimage: 'صورة',
    tovideo: 'فيديو', togif: 'جيف', attp: 'نص-متحرك', ttp: 'نص-ملون',
    lyrics: 'كلمات', upload: 'رفع', readviewonce: 'قراءة-مرة', stt: 'كتابة-أوديو',
    'img-blur': 'طمس', blur: 'تعتيم', say: 'قول', 'sticker-alt': 'ستيكر2',
    kick: 'طرد', promote: 'ترقية', demote: 'تخفيض', ban: 'حظر',
    tagall: 'منشن', hidetag: 'اخفاء', mute: 'كتم', unmute: 'الغاء-كتم',
    close: 'اغلاق', open: 'فتح', antilink: 'منع-روابط', warn: 'تحذير',
    antibadword: 'منع-شتائم', welcome: 'ترحيب', goodbye: 'وداع',
    groupinfo: 'معلومات-مجموعة', staff: 'طاقم', delete: 'حذف',
    warnings: 'تحذيرات',
    joke: 'نكتة', fact: 'حقيقة', quote: 'اقتباس', meme: 'ميم',
    truth: 'صراحة', dare: 'تحدي', ship: 'توافق', ngl: 'صراحة-مجهولة',
    '4kwallpaper': 'خلفيات', character: 'شخصية', goodnight: 'نعاس',
    stupid: 'مكلخ', flirt: 'غزل', insult: 'سب',
    menugame: 'قائمة-ألعاب', xo: 'اكس-او', tictactoe: 'اكس-او',
    rps: 'حجر-ورقة', math: 'رياضيات', guess: 'تخمين', scramble: 'خلط-كلمات',
    riddle: 'لغز', quiz: 'مسابقة', love: 'حب', hangman: 'مشنقة',
    trivia: 'ثقافة', eightball: 'كرة-سحرية', guesswho: 'شكون-انا',
    profile: 'بروفايل', daily: 'يومي', top: 'ترتيب', shop: 'متجر',
    gamble: 'قمار', slots: 'ماكينة', blackjack: 'بلاك-جاك',
    ping: 'بينغ', owner: 'المالك', help: 'مساعدة', alive: 'حي',
    system: 'نظام', setlang: 'لغة', script: 'سكريبت', allmenu: 'كل-الأوامر', menuu: 'قائمة',
    mode: 'وضع', devmsg: 'بث', pmblocker: 'حظر-خاص', anticall: 'منع-مكالمات',
    backup: 'نسخة-احتياطية', unban: 'الغاء-حظر', block: 'بلوك', unblock: 'فك-بلوك',
    cleartmp: 'مسح-مؤقت', sudo: 'مشرف', clear: 'مسح', clearsession: 'مسح-جلسة',
    autoreminder: 'تذكير-تلقائي', addsudo: 'إضافة-مشرف', delsudo: 'حذف-مشرف',
    listadmin: 'قائمة-المشرفين', schedule: 'توقيت-المجموعة',
    salat: 'صلاة', prayertimes: 'مواقيت', adhan: 'أذان', ad3iya: 'أدعية',
    hadith: 'حديث', azkar: 'أذكار', qibla: 'قبلة', tafsir: 'تفسير', surah: 'سورة', ayah: 'آية', dua: 'دعاء',
    asmaa: 'أسماء-الله', deen: 'دين',
    capcut: 'كاب-كت', reddit: 'ريديت', snapchat: 'سناب', likee: 'لايكي', twitter: 'تويتر', spotify: 'سبوتيفاي',
    'maroc-flag': 'علم-المغرب', hespress: 'هسبريس', alwadifa: 'الوظيفة', aljazeera: 'الجزيرة',
    news: 'أخبار', akhbar: 'أخبار', football: 'كرة', kora: 'كورة'
};

const catIcons = {
    new: '🔥', religion: '🕌', download: '📥', ai: '🤖', group: '👥', tools: '🛠️',
    news: '📡', daily: '💰', fun: '🎭', games: '🎮', general: '✨', owner: '👑'
};

function getMenuuCategories() {
    const base = getMenuCategories();
    return {
        new: base.new,
        religion: base.religion,
        download: base.download,
        ai: base.ai,
        group: base.group,
        tools: base.tools,
        fun_games: filterCategory([...RAW_CATEGORIES.fun, ...RAW_CATEGORIES.games]),
        economy_news: filterCategory([...RAW_CATEGORIES.daily, ...RAW_CATEGORIES.news]),
        general_owner: filterCategory([...RAW_CATEGORIES.general, ...RAW_CATEGORIES.owner])
    };
}

module.exports = {
    getMenuCategories,
    getMenuuCategories,
    getNativeCommands,
    isCommandAvailable,
    resolveCommandName,
    arCmds,
    catIcons,
    RAW_CATEGORIES
};
