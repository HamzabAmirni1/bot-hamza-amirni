const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { getSurahNumber } = require('../lib/quranUtils');

module.exports = async (sock, chatId, msg, args) => {
    try {
        if (!args[0] || !args[1]) {
            return await sendWithChannelButton(sock, chatId,
                `📖 *تفسير القرآن (Tafsir)*\n\n` +
                `✅ كاينين جوج طرق باش تستعمل هاد الأمر:\n\n` +
                `1️⃣ *بالسورة والرقم:*\n` +
                `   ${settings.prefix}tafsir [اسم السورة] [رقم الآية]\n` +
                `   مثال: ${settings.prefix}tafsir الفاتحة 1\n\n` +
                `2️⃣ *بالأرقام:*\n` +
                `   ${settings.prefix}tafsir [رقم السورة] [رقم الآية]\n` +
                `   مثال: ${settings.prefix}tafsir 1 1\n\n` +
                `⚔️ ${settings.botName}`,
                msg
            );
        }

        const surah = getSurahNumber(args[0]);
        const ayah = parseInt(args[1]);

        if (!surah || isNaN(ayah)) {
            return await sock.sendMessage(chatId, { text: '❌ يرجى التأكد من اسم السورة أو الرقم، ورقم الآية.' }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

        // Using Tafsir Moyassar from QuranEnc
        const url = `https://quranenc.com/api/v1/translation/aya/arabic_moyassar/${surah}/${ayah}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data && data.result) {
            const info = data.result;
            const text = `📖 *تفسير الميسر*\n\n` +
                `🕋 *سورة:* ${info.sura} - آية: ${info.aya}\n` +
                `📜 *الآية:* ${info.arabic_text}\n\n` +
                `📝 *التفسير:*\n${info.translation}\n\n` +
                `⚔️ ${settings.botName}`;

            await sendWithChannelButton(sock, chatId, text, msg);
        } else {
            await sock.sendMessage(chatId, { text: '❌ لم يتم العثور على تفسير لهذه الآية.' }, { quoted: msg });
        }

    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء جلب التفسير.' }, { quoted: msg });
    }
};
