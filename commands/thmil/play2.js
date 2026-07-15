const axios = require('axios');
const { t } = require('../../lib/language');
const settings = require('../../settings');
const { checkContent } = require('../../lib/contentFilter');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

async function play2Command(sock, chatId, msg, args, commands, userLang) {
    try {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            const usageMsg = userLang === 'ma'
                ? '🚫 *من فضلك أرسل اسم الأغنية بعد الأمر.*\nمثال: \n\n*.play hello*'
                : userLang === 'ar'
                    ? '🚫 *من فضلك أرسل اسم الأغنية بعد الأمر.*\nمثال: \n\n*.play hello*'
                    : '🚫 *Please send song name after command.*\nExample: \n\n*.play hello*';
            return await sock.sendMessage(chatId, { 
                text: usageMsg
            }, { quoted: msg });
        }

        // 🔞 NSFW Filter
        const filter = checkContent(searchQuery, userLang);
        if (filter.blocked) {
            await sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } });
            return await sock.sendMessage(chatId, { text: filter.message }, { quoted: msg });
        }

        // Send loading message
        const loadingMsg = userLang === 'ma'
            ? '⏳ *صبر، كنقلب ليك...*'
            : userLang === 'ar'
                ? '⏳ *يرجى الانتظار، جاري التحميل...*'
                : '⏳ *Please wait, downloading...*';
        
        await sock.sendMessage(chatId, {
            text: loadingMsg
        }, { quoted: msg });

        // Request audio info from external API
        const res = await tryRequest(() => axios.get(`https://pursky.vercel.app/api/ytplay?q=${encodeURIComponent(searchQuery)}`, AXIOS_DEFAULTS));
        const audio = res.data?.audio;

        if (!audio) {
            return await sock.sendMessage(chatId, { 
                text: userLang === 'ma' 
                    ? '❌ فشل في جلب رابط الصوت من API الخارجي، حاول مجدداً.'
                    : userLang === 'ar'
                        ? '❌ فشل في جلب رابط الصوت من API الخارجي، حاول مجدداً.'
                        : '❌ Failed to get audio link from external API, please try again.'
            }, { quoted: msg });
        }

        // Initialize headers
        const headers = res.data.note?.headers || {};
        const audioRes = await tryRequest(() => axios.get(audio, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': headers['User-Agent'] || 'Mozilla/5.0 (Linux; Android 10)',
                'Referer': headers['Referer'] || audio
            }
        }));

        let filename = searchQuery.replace(/\s+/g, '_') + '.mp3';

        // Send audio file
        await sock.sendMessage(chatId, {
            audio: Buffer.from(audioRes.data),
            mimetype: "audio/mpeg",
            fileName: filename,
            ptt: false,
            caption: userLang === 'ma'
                ? `🎵 تم تحميل: ${searchQuery}`
                : userLang === 'ar'
                    ? `🎵 تم تحميل: ${searchQuery}`
                    : `🎵 Downloaded: ${searchQuery}`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in play2 command:', error);
        await sock.sendMessage(chatId, { 
            text: userLang === 'ma'
                ? '⚠️ حدث خطأ أثناء تحميل الصوت.'
                : userLang === 'ar'
                    ? '⚠️ حدث خطأ أثناء تحميل الصوت.'
                    : '⚠️ An error occurred while downloading audio.'
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = play2Command;

/*Powered by Hamza Amirni*/
