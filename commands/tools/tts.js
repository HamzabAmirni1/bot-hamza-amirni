// Plugin by Hamza Amirni — TTS rewrite with reliable APIs

const axios = require('axios');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

// ─── Temp dir ────────────────────────────────────────────────────────────────
const tmpDir = path.join(__dirname, '../../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// ─── TTS Providers (try in order) ────────────────────────────────────────────
async function ttsStreamElements(text, lang) {
    // StreamElements TTS — very reliable, no auth needed
    const voice = {
        ar: 'Zeina',       // Arabic female
        en: 'Brian',       // English male
        fr: 'Celine',      // French female
        es: 'Conchita',    // Spanish
        de: 'Marlene',     // German
        id: 'id-ID-Standard-A',
    }[lang] || 'Brian';

    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    if (!res.data || res.data.byteLength < 1000) throw new Error('Empty audio');
    return Buffer.from(res.data);
}

async function ttsSiputzx(text, lang) {
    // Siputzx TTS API
    const url = `https://api.siputzx.my.id/api/tools/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    if (!res.data || res.data.byteLength < 1000) throw new Error('Empty audio');
    return Buffer.from(res.data);
}

async function ttsGoogle(text, lang) {
    // Google Translate TTS via proxy
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text.slice(0, 200))}`;
    const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0 Mobile Safari/537.36' },
        responseType: 'arraybuffer',
        timeout: 15000
    });
    if (!res.data || res.data.byteLength < 1000) throw new Error('Empty audio');
    return Buffer.from(res.data);
}

// ─── Try all providers ────────────────────────────────────────────────────────
async function generateTTS(text, lang) {
    const providers = [
        () => ttsStreamElements(text, lang),
        () => ttsSiputzx(text, lang),
        () => ttsGoogle(text, lang),
    ];
    let lastErr;
    for (const fn of providers) {
        try {
            const buf = await fn();
            if (buf && buf.length > 500) return buf;
        } catch (e) {
            lastErr = e;
            console.log('[TTS] provider failed:', e.message);
        }
    }
    throw new Error('All TTS providers failed: ' + (lastErr?.message || 'unknown'));
}

// ─── Convert MP3 → Opus voice note ──────────────────────────────────────────
function convertToOpus(inputBuf, ext = 'mp3') {
    return new Promise((resolve, reject) => {
        const ts = Date.now();
        const inputFile = path.join(tmpDir, `tts_in_${ts}.${ext}`);
        const outputFile = path.join(tmpDir, `tts_out_${ts}.ogg`);

        fs.writeFileSync(inputFile, inputBuf);

        const proc = spawn('ffmpeg', [
            '-y', '-i', inputFile,
            '-c:a', 'libopus',
            '-b:a', '64k',
            '-vbr', 'on',
            '-vn',
            outputFile
        ]);

        proc.on('error', (e) => {
            fs.existsSync(inputFile) && fs.unlinkSync(inputFile);
            reject(new Error('ffmpeg not found: ' + e.message));
        });

        proc.on('close', (code) => {
            fs.existsSync(inputFile) && fs.unlinkSync(inputFile);
            if (code !== 0) {
                fs.existsSync(outputFile) && fs.unlinkSync(outputFile);
                return reject(new Error('ffmpeg conversion failed (code ' + code + ')'));
            }
            const buf = fs.readFileSync(outputFile);
            fs.unlinkSync(outputFile);
            resolve(buf);
        });
    });
}

// ─── Language/voice map ───────────────────────────────────────────────────────
const langMap = {
    ar: 'ar', عربي: 'ar',
    en: 'en', english: 'en',
    fr: 'fr', french: 'fr',
    es: 'es', de: 'de',
    id: 'id',
    ma: 'ar',  // Moroccan Arabic → use Arabic TTS
};

const langLabel = { ar: 'عربي', en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', id: 'Indonesian' };

// ─── Main handler ─────────────────────────────────────────────────────────────
async function ttsCommand(sock, chatId, message, args, _commands, userLang) {
    const helpMessage = `🎙️ *أمر تحويل النص إلى صوت (TTS)*

📝 *الاستخدام:*
› ${settings.prefix}tts [نص]
› ${settings.prefix}tts [لغة] [نص]

💡 *أمثلة:*
› ${settings.prefix}tts السلام عليكم ورحمة الله
› ${settings.prefix}tts ar السلام عليكم
› ${settings.prefix}tts en Welcome everyone
› ${settings.prefix}tts fr Bonjour tout le monde

🌍 *اللغات:* ar · en · fr · es · de · id
⚔️ ${settings.botName}`;

    if (!args || args.length === 0) {
        return sendWithChannelButton(sock, chatId, helpMessage, message);
    }

    // Parse: optional lang code as first arg
    let langCode = 'ar';
    let textStart = 0;

    const firstLow = args[0].toLowerCase();
    if (langMap[firstLow]) {
        langCode = langMap[firstLow];
        textStart = 1;
    }

    const text = args.slice(textStart).join(' ').trim();
    if (!text) {
        return sendWithChannelButton(sock, chatId, helpMessage, message);
    }

    if (text.length > 500) {
        return sock.sendMessage(chatId, { text: '⚠️ الحد الأقصى 500 حرف.' }, { quoted: message });
    }

    await sock.sendMessage(chatId, {
        react: { text: '🎙️', key: message.key }
    });

    try {
        // 1. Generate audio buffer
        const audioBuf = await generateTTS(text, langCode);

        // 2. Try converting to opus voice note, fallback to sending as mp3
        let finalBuf, mimeType, isPtt;
        try {
            finalBuf = await convertToOpus(audioBuf, 'mp3');
            mimeType = 'audio/ogg; codecs=opus';
            isPtt = true;
        } catch (convErr) {
            console.log('[TTS] ffmpeg conversion failed, sending raw mp3:', convErr.message);
            finalBuf = audioBuf;
            mimeType = 'audio/mpeg';
            isPtt = false;
        }

        await sock.sendMessage(chatId, {
            audio: finalBuf,
            mimetype: mimeType,
            ptt: isPtt,
            fileName: `tts_${langCode}.${isPtt ? 'ogg' : 'mp3'}`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (err) {
        console.error('[TTS] Error:', err.message);
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, {
            text: `❌ *فشل TTS:* ${err.message}`
        }, { quoted: message });
    }
}

module.exports = ttsCommand;
