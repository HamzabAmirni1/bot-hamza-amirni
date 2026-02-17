// Plugin by Hamza Amirni
// Scrape by GilangSan
// Converted to CommonJS format

const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

// --- Helper Functions ---
async function tts(text, lang = 'ar') {
    if (!text) throw new Error('Please provide text for TTS.');

    try {
        // Use Google Translate TTS API (more reliable)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
    } catch (error) {
        throw new Error('Failed to generate audio: ' + error.message);
    }
}

// --- Voice/Language Mapping ---
const voiceMap = {
    // Arabic
    'ar': { code: 'ar', lang: 'عربي' },
    'عربي': { code: 'ar', lang: 'عربي' },
    // English
    'en': { code: 'en', lang: 'English' },
    'english': { code: 'en', lang: 'English' },
    // French
    'fr': { code: 'fr', lang: 'Français' },
    'french': { code: 'fr', lang: 'Français' },
    // Spanish
    'es': { code: 'es', lang: 'Español' },
    // German
    'de': { code: 'de', lang: 'Deutsch' },
    // Indonesian
    'id': { code: 'id', lang: 'Indonesian' },
    // Japanese
    'ja': { code: 'ja', lang: '日本語' },
    // Korean
    'ko': { code: 'ko', lang: '한국어' },
    // Chinese
    'zh': { code: 'zh-CN', lang: '中文' }
};

// --- Main Handler ---
async function sayCommand(sock, chatId, message, args) {
    try {
        // Generate the list of languages
        const langList = Object.entries(voiceMap)
            .filter(([key]) => key.length === 2 || key === 'عربي' || key === 'english' || key === 'french') // Show main ones
            .map(([key, value]) => `› *${key}* (${value.lang})`)
            .join('\n');

        // Generate help message
        const helpMessage = `🎙️ *أمر تحويل النص إلى صوت*

📝 *الاستخدام:*
${settings.prefix}say [لغة] [نص]

💡 *أمثلة:*
${settings.prefix}say ar السلام عليكم ورحمة الله
${settings.prefix}say en Hello world
${settings.prefix}say fr Bonjour

� *اللغات المتاحة:*
${langList}

⚔️ ${settings.botName}`;

        // Check if user provided enough arguments
        if (args.length < 2) {
            return await sendWithChannelButton(sock, chatId, helpMessage, message);
        }

        const langKey = args[0].toLowerCase();
        const langData = voiceMap[langKey];

        // Check if the provided language is valid
        if (!langData) {
            return await sock.sendMessage(chatId, {
                text: `❌ اللغة "${args[0]}" غير موجودة.\n\n${helpMessage}`
            }, { quoted: message });
        }

        const textToSpeak = args.slice(1).join(' ');

        await sock.sendMessage(chatId, {
            text: `🔊 جاري إنشاء الصوت باللغة *${langData.lang}*، الرجاء الانتظار...`
        }, { quoted: message });

        // Call the TTS function
        const audioBuffer = await tts(textToSpeak, langData.code);

        // Send the audio file
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true, // Send as voice note
            fileName: `tts_${langKey}.mp3`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in say command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ حدث خطأ: ${error.message}`
        }, { quoted: message });
    }
}

module.exports = sayCommand;
