const axios = require('axios');

/**
 * Translates Arabic (including Darija) or any non-English text to English.
 * @param {string} text - The input text to translate.
 * @returns {Promise<string>} - The translated English text or the original text if translation fails.
 */
async function translateToEn(text) {
    if (!text) return '';

    // Check if text contains Arabic characters
    const isArabic = /[\u0600-\u06FF]/.test(text);
    if (!isArabic) return text;

    try {
        console.log(`[Translate] Auto-translating to English: "${text.substring(0, 50)}..."`);

        // Google Translate API (reliable for AI prompts)
        const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);

        if (res.data && res.data[0] && res.data[0][0] && res.data[0][0][0]) {
            const translated = res.data[0][0][0];
            console.log(`[Translate] ✅ Translated to: "${translated}"`);
            return translated;
        }

        return text;
    } catch (err) {
        console.error('[Translate] ❌ Failed to translate:', err.message);
        return text;
    }
}

module.exports = { translateToEn };
