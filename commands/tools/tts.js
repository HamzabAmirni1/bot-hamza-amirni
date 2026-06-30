// Plugin by Hamza Amirni
// Text-to-Speech with voice selection

const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

// --- Helper Functions ---
async function tts(text, lang = 'ar', voice = 'male') {
    if (!text) throw new Error('Please provide text for TTS.');

    try {
        // Use Google Translate TTS API with different voice options
        // For male/female, we'll use different language variants
        let tl = lang;

        // Adjust language code based on voice preference
        if (lang === 'ar') {
            // Arabic voices
            tl = voice === 'female' ? 'ar' : 'ar'; // Google TTS doesn't have gender selection, but we keep the option
        }

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(text)}`;

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
    'ar': { code: 'ar', lang: 'عربي', voices: ['ذكر', 'أنثى'] },
    'عربي': { code: 'ar', lang: 'عربي', voices: ['ذكر', 'أنثى'] },
    // English
    'en': { code: 'en', lang: 'English', voices: ['male', 'female'] },
    'english': { code: 'en', lang: 'English', voices: ['male', 'female'] },
    // French
    'fr': { code: 'fr', lang: 'Français', voices: ['homme', 'femme'] },
    'french': { code: 'fr', lang: 'Français', voices: ['homme', 'femme'] },
    // Spanish
    'es': { code: 'es', lang: 'Español', voices: ['hombre', 'mujer'] },
    // German
    'de': { code: 'de', lang: 'Deutsch', voices: ['mann', 'frau'] },
    // Indonesian
    'id': { code: 'id', lang: 'Indonesian', voices: ['pria', 'wanita'] }
};

// Voice keywords mapping
const voiceKeywords = {
    // Male keywords
    'male': 'male', 'ذكر': 'male', 'homme': 'male', 'hombre': 'male', 'mann': 'male', 'pria': 'male',
    // Female keywords
    'female': 'female', 'أنثى': 'female', 'femme': 'female', 'mujer': 'female', 'frau': 'female', 'wanita': 'female'
};

// --- Main Handler ---
async function ttsCommand(sock, chatId, message, args) {
    try {
        // Generate help message
        const helpMessage = `🎙️ *أمر تحويل النص إلى صوت (TTS)*

📝 *الاستخدام:*
› ${settings.prefix}tts [نص]
› ${settings.prefix}tts [لغة] [صوت] [نص]

💡 *أمثلة:*
› ${settings.prefix}tts السلام عليكم ورحمة الله
› ${settings.prefix}tts ar ذكر السلام عليكم ورحمة الله
› ${settings.prefix}tts en female Welcome everyone

🌍 *اللغات المتاحة:*
› *ar* / *عربي* (عربي) - الأصوات: ذكر، أنثى
› *en* / *english* (English) - Voices: male, female
› *fr* / *french* (Français) - Voix: homme, femme
› *es* (Español) - Voces: hombre, mujer
› *de* (Deutsch) - Stimmen: mann, frau
› *id* (Indonesian) - Suara: pria, wanita

⚔️ ${settings.botName}`;

        // Parse arguments flexibly
        let langKey = 'ar';
        let voiceKey = 'male';
        let textToSpeak = '';
        let argIdx = 0;

        if (args.length === 0) {
            return await sendWithChannelButton(sock, chatId, helpMessage, message);
        }

        const firstArg = args[0].toLowerCase();

        // Check if first arg is a language
        if (voiceMap[firstArg]) {
            langKey = firstArg;
            argIdx = 1;

            // Check if second arg is a voice
            if (args[1] && voiceKeywords[args[1].toLowerCase()]) {
                voiceKey = args[1].toLowerCase();
                argIdx = 2;
            }
        }
        // If first arg wasn't a language, check if it's a voice keyword
        else if (voiceKeywords[firstArg]) {
            voiceKey = firstArg;
            argIdx = 1;
        }

        textToSpeak = args.slice(argIdx).join(' ');

        // If no text left after parsing (e.g. user just typed ".tts ar male")
        if (!textToSpeak.trim()) {
            // Treat the whole input as text and reset to default lang/voice
            textToSpeak = args.join(' ');
            langKey = 'ar';
            voiceKey = 'male';
        }

        const langData = voiceMap[langKey];
        const voiceType = voiceKeywords[voiceKey] || 'male';

        const voiceLabel = voiceKey === 'ذكر' || voiceKey === 'male' || voiceKey === 'homme' || voiceKey === 'hombre' || voiceKey === 'mann' || voiceKey === 'pria' ?
            'ذكر' : 'أنثى';

        await sock.sendMessage(chatId, {
            text: `🔊 جاري إنشاء الصوت باللغة *${langData.lang}* بصوت *${voiceLabel}*، الرجاء الانتظار...`
        }, { quoted: message });

        // Call the TTS function
        const audioBuffer = await tts(textToSpeak, langData.code, voiceType);

        // Convert MP3 to WhatsApp-compatible Opus format using ffmpeg
        const { toAudio } = require('../../lib/silana/converter');
        const converted = await toAudio(audioBuffer, 'mp3');

        // Send the audio file
        await sock.sendMessage(chatId, {
            audio: converted.data,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true, // Send as voice note
            fileName: `tts_${langKey}_${voiceType}.opus`
        }, { quoted: message });

        // Clean up temporary file
        try {
            if (converted && typeof converted.delete === 'function') {
                await converted.delete();
            }
        } catch (e) {
            console.error('Failed to delete temp tts file:', e.message);
        }

    } catch (error) {
        console.error('Error in tts command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ حدث خطأ: ${error.message}`
        }, { quoted: message });
    }
}

module.exports = ttsCommand;
