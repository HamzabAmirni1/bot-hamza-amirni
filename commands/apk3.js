const { fetchJson } = require('../lib/myfunc');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function apk3Command(sock, chatId, msg, args, commands, userLang) {
    const query = args.join(' ').trim();
    const message = msg;

    if (!query) {
        const helpMsg = userLang === 'ma'
            ? `📥 *تحميل تطبيقات APK (V3)* 📥\n\n🔹 *الاستخدام:*\n${settings.prefix}apk3 [اسم التطبيق]\n\n📝 *أمثلة:*\n• ${settings.prefix}apk3 Instagram\n\n⚔️ ${settings.botName}`
            : userLang === 'ar'
                ? `📥 *تحميل تطبيقات APK (V3)* 📥\n\n🔹 *الاستخدام:*\n${settings.prefix}apk3 [اسم التطبيق]\n\n⚔️ ${settings.botName}`
                : `📥 *APK Downloader (V3)* 📥\n\n🔹 *Usage:*\n${settings.prefix}apk3 [App Name]\n\n⚔️ ${settings.botName}`;

        return await sendWithChannelButton(sock, chatId, helpMsg, message);
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⬇️", key: message.key } });

        const searchMsg = userLang === 'ma'
            ? `🔍 *كنقلب على "${query}" فالسيرفر التالت...*`
            : userLang === 'ar'
                ? `🔍 *جاري البحث عن "${query}" عبر السيرفر 3...*`
                : `🔍 *Searching for "${query}" via Server 3...*`;
        await sendWithChannelButton(sock, chatId, searchMsg, message);

        const aptoide = require('../lib/aptoide');
        const app = await aptoide.downloadInfo(query);

        if (!app) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            return await sendWithChannelButton(sock, chatId, `❌ *No results found for "${query}".*`, message);
        }

        const sizeMB = app.sizeMB;

        // Large file warning (Limit 300MB)
        if (parseFloat(sizeMB) > 300) {
            await sock.sendMessage(chatId, { react: { text: "⚠️", key: message.key } });
            const largeMsg = userLang === 'ma'
                ? `⚠️ *التطبيق كبير بزاف (${sizeMB} MB). الحد هو 300MB.*`
                : userLang === 'ar'
                    ? `⚠️ *حجم التطبيق كبير جداً (${sizeMB} MB). الحد هو 300 ميجا.*`
                    : `⚠️ *App too large (${sizeMB} MB). Limit is 300MB.*`;
            return await sendWithChannelButton(sock, chatId, largeMsg, message);
        }

        const caption = `🎮 *Name:* ${app.name}\n📦 *Size:* ${sizeMB} MB\n\n⏬ *Sending file...*\n⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { react: { text: "⬆️", key: message.key } });

        await sock.sendMessage(chatId, {
            document: { url: app.downloadUrl },
            fileName: `${app.name}.apk`,
            mimetype: 'application/vnd.android.package-archive',
            caption: caption
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error('Error in apk3 command:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sendWithChannelButton(sock, chatId, `❌ *Error in Server 3. Try .apk or .apk2.*`, message);
    }
}

module.exports = apk3Command;
