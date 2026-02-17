const axios = require('axios');
const cheerio = require('cheerio');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function searchFDroid(query) {
    const url = `https://search.f-droid.org/?q=${encodeURIComponent(query)}&lang=en`;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const apps = [];
        $('.package-header').each((index, element) => {
            if (index >= 10) return; // Limit to 10 results
            const title = $(element).find('.package-name').text().trim();
            const relPath = $(element).attr('href');
            const apkUrl = relPath ? `https://f-droid.org${relPath}` : '';
            const LinkGambar = $(element).find('.package-icon').attr('src');
            apps.push({ title, apkUrl, LinkGambar });
        });
        return apps;
    } catch (error) {
        console.error('F-Droid Scraper Error:', error);
        return [];
    }
}

async function fdroidCommand(sock, chatId, msg, args) {
    const query = args.join(' ').trim();

    if (!query) {
        const helpMsg = `🔍 *الباحث في متجر F-Droid* 🔍

🔹 *كيفاش تخدمو:*
${settings.prefix}f-droid [سمية التطبيق/البرنامج]

📝 *مثال:*
${settings.prefix}f-droid Termux

💡 *ملاحظة:* هاد الأمر كيعطيك غير الروابط الرسمية ديال F-Droid. إلا بغيتي تيليشارجي التطبيق نيشان (APK)، استعمل أمر:
*.apk* [السمية]

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

        const apps = await searchFDroid(query);

        if (apps.length > 0) {
            let message = `✅ *لقينا هاد التطبيقات فـ F-Droid على: ${query}*\n\n`;
            apps.forEach((app, index) => {
                message += `${index + 1}. *${app.title}*\n🔗 الرابط: ${app.apkUrl}\n\n`;
            });
            message += `💡 *نصيحة:* إلا بغيتي تيليشارجي الـ APK ديريكت، استعمل أمر: *.apk ${query}*\n\n`;
            message += `⚔️ ${settings.botName}`;

            await sock.sendMessage(chatId, { text: message }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } else {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chatId, { text: `❌ مالقينا والو فـ F-Droid بسمية "${query}".` }, { quoted: msg });
        }
    } catch (error) {
        console.error('Error in FDroid command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء البحث.\n⚠️ السبب: ${error.message}`, msg);
    }
}

module.exports = fdroidCommand;
