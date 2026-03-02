const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');
const { getSurahNumber } = require('../../lib/quranUtils');

module.exports = async (sock, chatId, msg, args) => {
    try {
        if (!args[0] || !args[1]) {
            return await sendWithChannelButton(sock, chatId,
                `📜 *البحث عن آية (Ayah)*\n\n` +
                `✅ كاينين جوج طرق باش تستعمل هاد الأمر:\n\n` +
                `1️⃣ *بالسورة والرقم:*\n` +
                `   ${settings.prefix}ayah [اسم السورة] [رقم الآية]\n` +
                `   مثال: ${settings.prefix}ayah البقرة 255\n\n` +
                `2️⃣ *بالأرقام:*\n` +
                `   ${settings.prefix}ayah [رقم السورة] [رقم الآية]\n` +
                `   مثال: ${settings.prefix}ayah 2 255\n\n` +
                `⚔️ ${settings.botName}`,
                msg
            );
        }

        const surah = getSurahNumber(args[0]);
        const ayah = parseInt(args[1]);

        if (!surah || isNaN(ayah)) {
            return await sock.sendMessage(chatId, { text: '❌ يرجى التأكد من اسم السورة أو الرقم، ورقم الآية.' }, { quoted: msg });
        }

        const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`;
        const response = await axios.get(url);

        if (response.data && response.data.status === 'OK') {
            const data = response.data.data;
            const caption = `📜 *القرآن الكريم*\n\n` +
                `🕋 *سورة:* ${data.surah.name}\n` +
                `🔢 *آية:* ${data.numberInSurah}\n\n` +
                `✨ ${data.text}\n\n` +
                `⚔️ ${settings.botName}`;

            await sendWithChannelButton(sock, chatId, caption, msg);

            if (data.audio) {
                await sock.sendMessage(chatId, {
                    audio: { url: data.audio },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: msg });
            }

        } else {
            await sock.sendMessage(chatId, { text: '❌ لم يتم العثور على الآية.' }, { quoted: msg });
        }

    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء جلب الآية.' }, { quoted: msg });
    }
};
