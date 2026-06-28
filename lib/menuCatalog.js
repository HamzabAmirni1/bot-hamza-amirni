const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '../commands');

/** Menu alias → native command file basename */
const MENU_ALIASES = {
    xo: 'tictactoe',
    togif: 'sticker',
    group: 'groupinfo',
    youtube: 'video',
    ytplay: 'play',
    song: 'play',
    pin: 'pinterest',
};

const RAW_CATEGORIES = {
    download: [
        'video', 'youtube', 'tiktok', 'facebook', 'instagram', 'play', 'song', 'ytplay',
        'mediafire', 'pinterest', 'pinterestdl', 'gdrive', 'github', 'gitrepo',
        'apk', 'apk2', 'apk3', 'capcut', 'f-droid', 'likee', 'live', 'qdl',
        'reddit', 'snapchat', 'song2', 'spotify', 'tahmil-app', 'twitter',
        'ytdl', 'ytmp4', 'ytmp4v2', 'ytmp4v3', 'yts', 'yts2'
    ],
    tools: [
        'tomp3', 'qrcode', 'tts', 'say', 'hazf-sawt', 'ping'
    ],
    fun: [
        'joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare',
        'ship', 'ngl', '4kwallpaper', 'areact', 'cat', 'dog', 'eightball',
        'flirt', 'ghibli', 'goodnight', 'insult', 'rate', 'simp', 'stupid',
        'topmembers', 'wasted', 'compliment', 'love', 'top'
    ],
    games: [
        'menugame', 'xo', 'tictactoe', 'rps', 'math', 'guess', 'scramble',
        'riddle', 'quiz', 'hangman', 'trivia', 'blackjack', 'emojigame',
        'guesswho', 'kalimat', 'truefalse', 'werewolf', 'daily', 'gamble',
        'slots', 'shop', 'emojimix', 'football'
    ],
    group: [
        'kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute',
        'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye',
        'warn', 'warnings', 'antibadword', 'antilink', 'schedule', 'anticall',
        'antidelete', 'antigroupcall', 'autoread', 'autostatus', 'autowelcome',
        'ghosttag', 'setpp', 'tag', 'admin', 'autoreminder', 'listadmin',
        'pmblocker'
    ],
    kora: [
        'kora', 'football'
    ],
    general: [
        'alive', 'ping', 'owner', 'help', 'allmenu', 'msgtodev', 'setlang',
        'system'
    ],
    owner: [
        'mode', 'devmsg', 'backup', 'ban', 'unban', 'block', 'unblock',
        'cleartmp', 'sudo', 'clear', 'clearsession', 'addsudo', 'delsudo',
        'getsession', 'resetlink', 'upswgc', 'broadcast', 'setlang'
    ]
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
        const result = filterCategory(cmds);
        if (result.length > 0) filtered[cat] = result;
    }
    return filtered;
}

const arCmds = {
    // Download
    video: 'فيديو', youtube: 'يوتيوب', tiktok: 'تيكتوك', facebook: 'فيسبوك',
    instagram: 'انستا', play: 'شغل', song: 'أغنية', ytplay: 'تشغيل',
    mediafire: 'ميديافاير', pinterest: 'بينترست', pinterestdl: 'تحميل-بينترست',
    gdrive: 'قوقل-درايف', github: 'جيتهاب', gitrepo: 'تحميل-مستودع',
    apk: 'تطبيق', apk2: 'تطبيق2', apk3: 'تطبيق3', capcut: 'كاب-كت',
    'f-droid': 'اف-درويد', likee: 'لايكي', live: 'بث-مباشر', qdl: 'تحميل-سريع',
    reddit: 'ريديت', snapchat: 'سناب', song2: 'أغنية2', spotify: 'سبوتيفاي',
    twitter: 'تويتر', ytdl: 'يوتيوب-تحميل', ytmp4: 'يوتيوب-mp4',
    ytmp4v2: 'يوتيوب-mp4v2', ytmp4v3: 'يوتيوب-mp4v3', yts: 'بحث-يوتيوب', yts2: 'بحث-يوتيوب2',
    // Tools
    tomp3: 'صوت', qrcode: 'كيو-آر', tts: 'نطق', say: 'قول', 'hazf-sawt': 'حذف-صوت', ping: 'بينغ',
    // Fun
    joke: 'نكتة', fact: 'حقيقة', quote: 'اقتباس', meme: 'ميم',
    truth: 'صراحة', dare: 'تحدي', ship: 'توافق', ngl: 'صراحة-مجهولة',
    '4kwallpaper': 'خلفيات', character: 'شخصية', goodnight: 'نعاس',
    stupid: 'مكلخ', flirt: 'غزل', insult: 'سب', compliment: 'مدح',
    love: 'حب', top: 'ترتيب', simp: 'عاشق', rate: 'تقييم',
    topmembers: 'أعضاء', wasted: 'خسارة', areact: 'ردود', cat: 'قطة',
    dog: 'كلب', eightball: 'كرة-سحرية', ghibli: 'جيبلي', wasted2: 'هالك',
    // Games
    menugame: 'قائمة-ألعاب', xo: 'اكس-او', tictactoe: 'اكس-او',
    rps: 'حجر-ورقة', math: 'رياضيات', guess: 'تخمين', scramble: 'خلط-كلمات',
    riddle: 'لغز', quiz: 'مسابقة', hangman: 'مشنقة',
    trivia: 'ثقافة', guesswho: 'شكون-انا', kalimat: 'كلمات',
    truefalse: 'صح-غلط', werewolf: 'ذئب', daily: 'يومي',
    gamble: 'قمار', slots: 'ماكينة', shop: 'متجر', blackjack: 'بلاك-جاك',
    emojigame: 'ايموجي', emojimix: 'خلط-ايموجي', football: 'كرة-قدم',
    // Group
    kick: 'طرد', promote: 'ترقية', demote: 'تخفيض', tagall: 'منشن',
    hidetag: 'اخفاء', mute: 'كتم', unmute: 'الغاء-كتم',
    close: 'اغلاق', open: 'فتح', antilink: 'منع-روابط', warn: 'تحذير',
    antibadword: 'منع-شتائم', welcome: 'ترحيب', goodbye: 'وداع',
    groupinfo: 'معلومات-مجموعة', staff: 'طاقم', delete: 'حذف',
    warnings: 'تحذيرات', schedule: 'توقيت', anticall: 'منع-مكالمات',
    antidelete: 'منع-حذف', antigroupcall: 'منع-مكالمة-جماعية',
    autoread: 'قراءة-تلقائية', autostatus: 'حالات-تلقائية',
    autowelcome: 'ترحيب-تلقائي', ghosttag: 'تاق-مخفي',
    setpp: 'صورة-مجموعة', tag: 'تاق', admin: 'مشرف',
    autoreminder: 'تذكير-تلقائي', listadmin: 'المشرفون', pmblocker: 'حظر-خاص',
    // Kora
    kora: 'كورة',
    // General
    alive: 'حي', owner: 'المالك', help: 'مساعدة', allmenu: 'كل-الأوامر',
    msgtodev: 'رسالة-للمطور', setlang: 'لغة', system: 'نظام',
    // Owner
    mode: 'وضع', devmsg: 'بث', backup: 'نسخة-احتياطية',
    ban: 'حظر', unban: 'الغاء-حظر', block: 'بلوك', unblock: 'فك-بلوك',
    cleartmp: 'مسح-مؤقت', sudo: 'مشرف', clear: 'مسح', clearsession: 'مسح-جلسة',
    addsudo: 'إضافة-مشرف', delsudo: 'حذف-مشرف',
    getsession: 'جلسة', resetlink: 'تجديد-رابط', upswgc: 'تحديث', broadcast: 'بث'
};

const catIcons = {
    download: '📥',
    tools:   '🛠️',
    fun:     '🎭',
    games:   '🎮',
    group:   '👥',
    kora:    '⚽',
    general: '✨',
    owner:   '👑'
};

// Invalidate cache when called fresh
function resetCache() { nativeCommandsCache = null; }

module.exports = {
    getMenuCategories,
    getNativeCommands,
    isCommandAvailable,
    resolveCommandName,
    resetCache,
    arCmds,
    catIcons,
    RAW_CATEGORIES
};
