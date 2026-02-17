const fetch = require('node-fetch');
const { t } = require('../lib/language');

const languageCodes = {
    // Top Languages
    ar: "Arabic",
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",

    // Middle East & Africa
    tr: "Turkish",
    fa: "Persian",
    ur: "Urdu",
    he: "Hebrew",
    am: "Amharic",
    yo: "Yoruba",
    ig: "Igbo",
    ha: "Hausa",
    sw: "Swahili",

    // Asia & Pacific
    hi: "Hindi",
    bn: "Bengali",
    pa: "Punjabi",
    id: "Indonesian",
    ms: "Malay",
    th: "Thai",
    vi: "Vietnamese",
    tl: "Tagalog",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",

    // Europe
    pl: "Polish",
    uk: "Ukrainian",
    nl: "Dutch",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    el: "Greek",
    cs: "Czech",
    ro: "Romanian",
    hu: "Hungarian",
    tr: "Turkish",

    // Others
    sq: "Albanian",
    hy: "Armenian",
    az: "Azerbaijani",
    eu: "Basque",
    be: "Belarusian",
    bs: "Bosnian",
    ca: "Catalan",
    hr: "Croatian",
    et: "Estonian",
    gl: "Galician",
    ka: "Georgian",
    is: "Icelandic",
    lv: "Latvian",
    lt: "Lithuanian",
    mk: "Macedonian",
    mt: "Maltese",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    uz: "Uzbek"
};

module.exports = async function translateCommand(sock, chatId, msg, args, commands, userLang, match) {
    try {
        // Show typing indicator
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';

        // Case 1: If it's a reply
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage) {
            textToTranslate =
                quotedMessage.conversation ||
                quotedMessage.extendedTextMessage?.text ||
                quotedMessage.imageMessage?.caption ||
                quotedMessage.videoMessage?.caption ||
                '';

            lang = match ? match.trim() : '';
        }
        // Case 2: Direct input
        else {
            const inputArgs = match ? match.trim().split(' ') : [];
            if (inputArgs.length < 2) {
                const available = Object.entries(languageCodes)
                    .map(([code, name]) => `▫️ ${code} = ${name}`)
                    .join("\n");

                return sock.sendMessage(chatId, {
                    text: t('translate.usage', { available }),
                    quoted: msg
                });
            }

            lang = inputArgs[inputArgs.length - 1]; // last word is language code
            textToTranslate = inputArgs.slice(0, -1).join(' '); // rest is text
        }


        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: t('translate.no_text'),
                quoted: msg
            });
        }

        // Try multiple translation APIs
        let translatedText = null;

        // API 1 - Google Translate
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`);
            if (res.ok) {
                const data = await res.json();
                if (data?.[0]?.[0]?.[0]) translatedText = data[0][0][0];
            }
        } catch { }

        // API 2 - MyMemory
        if (!translatedText) {
            try {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.responseData?.translatedText) translatedText = data.responseData.translatedText;
                }
            } catch { }
        }

        // API 3 - Backup API
        if (!translatedText) {
            try {
                const res = await fetch(`https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.translated) translatedText = data.translated;
                }
            } catch { }
        }

        if (!translatedText) {
            throw new Error('All translation APIs failed');
        }

        // Send translation result
        await sock.sendMessage(chatId, {
            text: t('translate.result', { lang, text: translatedText }),
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Error in translate command:', error);
        await sock.sendMessage(chatId, {
            text: t('translate.error'),
            quoted: msg
        });
    }
};
