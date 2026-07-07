/**
 * Content Filter – blocks NSFW / adult / inappropriate queries.
 * Checked before executing yts, video, play, song, img, genai, etc.
 */

// ── Banned keyword list ───────────────────────────────────────────────────────
const BANNED_KEYWORDS = [
    // English
    'porn', 'porno', 'pornhub', 'xvideos', 'xxnx', 'xnxx', 'xhamster',
    'nude', 'naked', 'nsfw', 'sex', 'sexy', 'hentai', 'hintay', 'hentay',
    'blowjob', 'blowjobs', 'cumshot', 'creampie', 'gangbang', 'threesome',
    'anal', 'pussy', 'dick', 'cock', 'penis', 'vagina', 'boobs', 'boob',
    'tits', 'ass', 'masturbat', 'orgasm', 'erotic', 'xxx', 'onlyfans',
    'milf', 'incest', 'rape', 'fetish', 'bdsm', 'whore', 'slut', 'bitch',

    // Arabic / Darija
    'سكس', 'افلام سكس', 'نيك', 'كس', 'زب', 'طيز', 'شرموطة', 'عاهرة',
    'بزاز', 'إباحي', 'اباحي', 'نيكاح', 'جنس', 'مص', 'لحس', 'تعري',
    'عري', 'صور عارية', 'ممارسة الجنس', 'مقاطع جنسية',

    // French
    'porno', 'cul', 'bite', 'chatte', 'salope', 'putain',
];

// Build a fast lowercase Set for exact word matching
const BANNED_SET = new Set(BANNED_KEYWORDS.map(k => k.toLowerCase()));

/**
 * Returns true if the query contains any banned keyword.
 * @param {string} query
 * @returns {boolean}
 */
function isNSFW(query) {
    if (!query || typeof query !== 'string') return false;
    const lower = query.toLowerCase();

    // Check each banned keyword as a substring (catches compound words like "xxxvideos")
    for (const kw of BANNED_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) return true;
    }
    return false;
}

/**
 * Returns an object { blocked: true, message: '...' } if NSFW, else { blocked: false }.
 * @param {string} query
 * @param {string} [userLang='ar']
 * @returns {{ blocked: boolean, message?: string }}
 */
function checkContent(query, userLang = 'ar') {
    if (!isNSFW(query)) return { blocked: false };

    const messages = {
        ar: '🚫 *هذا المحتوى محظور!*\n\nلا يمكن تحميل أو البحث عن محتوى إباحي أو للبالغين عبر هذا البوت.\n\n⚠️ تكرار المحاولة سيؤدي إلى حظرك.',
        ma: '🚫 *هاد المحتوى محظور!*\n\nالبوت ماعندوش الحق يدير تحميل أو بحث عن محتوى للكبار.\n\n⚠️ إلا كررتي غادي تتبانك.',
        en: '🚫 *This content is blocked!*\n\nAdult or NSFW content is not allowed on this bot.\n\n⚠️ Repeated attempts will result in a ban.',
    };

    return {
        blocked: true,
        message: messages[userLang] || messages.ar,
    };
}

module.exports = { isNSFW, checkContent };
