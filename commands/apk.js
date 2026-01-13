const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { t } = require('../lib/language');
const { canDownload, incrementDownload, DAILY_LIMIT } = require('../lib/apkLimiter');

async function apkCommand(sock, chatId, message, args, commands, userLang) {
    const query = args.join(' ').trim();
    const senderId = message.key.participant || message.key.remoteJid;

    // Check daily limit FIRST
    const limitCheck = canDownload(senderId);
    if (!limitCheck.allowed) {
        const limitMsg = userLang === 'ma'
            ? `⛔ *وصلتي للحد اليومي!*\n\n📊 *الحد:* ${DAILY_LIMIT} تطبيقات في اليوم\n⏰ *جرب غداً* للحصول على ${DAILY_LIMIT} تحميلات جديدة.\n\n⚔️ ${settings.botName}`
            : userLang === 'ar'
                ? `⛔ *وصلت للحد اليومي!*\n\n📊 *الحد:* ${DAILY_LIMIT} تطبيقات يومياً\n⏰ *حاول غداً* للحصول على ${DAILY_LIMIT} تحميلات جديدة.\n\n⚔️ ${settings.botName}`
                : `⛔ *Daily Limit Reached!*\n\n📊 *Limit:* ${DAILY_LIMIT} APKs per day\n⏰ *Try tomorrow* for ${DAILY_LIMIT} new downloads.\n\n⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, limitMsg, message);
    }


    if (!query) {
        const helpMsg = userLang === 'ma'
            ? `📥 *تحميل تطبيقات APK (سريع)* 📥\n\n🔹 *الاستخدام:*\n${settings.prefix}apk [اسم التطبيق]\n\n📝 *أمثلة:*\n• ${settings.prefix}apk Instagram\n• ${settings.prefix}apk WhatsApp Lite\n\n📊 *المتبقي اليوم:* ${limitCheck.remaining}/${DAILY_LIMIT}\n\n⚔️ ${settings.botName}`
            : userLang === 'ar'
                ? `📥 *تحميل تطبيقات APK (سريع)* 📥\n\n🔹 *الاستخدام:*\n${settings.prefix}apk [اسم التطبيق]\n\n📝 *أمثلة:*\n• ${settings.prefix}apk Instagram\n\n📊 *المتبقي اليوم:* ${limitCheck.remaining}/${DAILY_LIMIT}\n\n⚔️ ${settings.botName}`
                : `📥 *APK Downloader (Fast)* 📥\n\n🔹 *Usage:*\n${settings.prefix}apk [App Name]\n\n📝 *Examples:*\n• ${settings.prefix}apk Instagram\n\n📊 *Remaining Today:* ${limitCheck.remaining}/${DAILY_LIMIT}\n\n⚔️ ${settings.botName}`;

        return await sendWithChannelButton(sock, chatId, helpMsg, message);
    }
    // Check if the user inadvertently pasted a URL
    if (query.startsWith('http')) {
        if (query.includes('mediafire.com')) {
            const mfireMsg = userLang === 'ma'
                ? `❌ *هدشي ماشي سمية د تطبيق!*\n\n⚠️ نتا صيفطتي *رابط ميديافاير*.\n💡 جرب استخدم: ${settings.prefix}mediafire [الرابط]`
                : `❌ *Invalid Input!*\n\n⚠️ You sent a *MediaFire Link*.\n💡 Please use: ${settings.prefix}mediafire [URL]`;
            return await sendWithChannelButton(sock, chatId, mfireMsg, message);
        }

        const urlMsg = userLang === 'ma'
            ? `❌ *هاد الأمر خاص بالبحث بالسمية فقط.*\n\n⚠️ ما تصيفطش ليان (Rabit). كتب غير سمية التطبيق.\n📝 مثال: ${settings.prefix}apk whatsapp`
            : `❌ *Invalid Input!*\n\n⚠️ Do not send URLs. Just type the app name.\n📝 Example: ${settings.prefix}apk whatsapp`;
        return await sendWithChannelButton(sock, chatId, urlMsg, message);
    }


    try {
        // Step 1: React with download icon
        await sock.sendMessage(chatId, { react: { text: "⬇️", key: message.key } });

        const searchMsg = userLang === 'ma'
            ? `🔍 *كنقلب على "${query}"...*`
            : userLang === 'ar'
                ? `🔍 *جاري البحث عن "${query}"...*`
                : `🔍 *Searching for "${query}"...*`;
        await sendWithChannelButton(sock, chatId, searchMsg, message);

        // Aptoide API URL
        const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`;

        const response = await axios.get(apiUrl, { timeout: 15000 });
        const data = response.data;

        if (!data.datalist || !data.datalist.list || !data.datalist.list.length) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            const notFoundMsg = userLang === 'ma'
                ? `❌ *ما لقيناش "${query}".*`
                : userLang === 'ar'
                    ? `❌ *عذراً، لم يتم العثور على "${query}".*`
                    : `❌ *No results found for "${query}".*`;
            return await sendWithChannelButton(sock, chatId, notFoundMsg, message);
        }

        const app = data.datalist.list[0];
        const sizeMB = (app.size / (1024 * 1024)).toFixed(2);

        // Large file warning (WhatsApp has limits)
        if (parseFloat(sizeMB) > 300) {
            await sock.sendMessage(chatId, { react: { text: "⚠️", key: message.key } });
            const largeMsg = userLang === 'ma'
                ? `⚠️ *التطبيق كبير بزاف (${sizeMB} MB). ما نقدرش نصيفطو.*`
                : userLang === 'ar'
                    ? `⚠️ *حجم التطبيق كبير جداً (${sizeMB} MB). الحد الأقصى 300 ميجا.*`
                    : `⚠️ *App too large (${sizeMB} MB). Limit is 300MB.*`;
            return await sendWithChannelButton(sock, chatId, largeMsg, message);
        }

        const caption = userLang === 'ma'
            ? `🎮 *اسم التطبيق:* ${app.name}\n📦 *الحزمة:* ${app.package}\n📅 *ميزاجور:* ${app.updated}\n📁 *الحجم:* ${sizeMB} MB\n\n🔗 *تابعني (Follow):*\n📸 *Insta:* ${settings.instagram}\n🎥 *YouTube:* ${settings.youtube}\n📘 *Facebook:* ${settings.facebookPage}\n\n⏬ *هانا كنصيفطو ليك...*\n⚔️ ${settings.botName}`
            : `🎮 *App Name:* ${app.name}\n📦 *Package:* ${app.package}\n📅 *Updated:* ${app.updated}\n📁 *Size:* ${sizeMB} MB\n\n🔗 *Follow Me:*\n📸 *Insta:* ${settings.instagram}\n🎥 *YouTube:* ${settings.youtube}\n📘 *Facebook:* ${settings.facebookPage}\n\n⏬ *Sending file...*\n⚔️ ${settings.botName}`;

        // Step 2: React with upload icon
        await sock.sendMessage(chatId, { react: { text: "⬆️", key: message.key } });

        // Download link (using path_alt as in user request)
        const downloadUrl = app.file.path_alt || app.file.path;

        // Send the document
        await sock.sendMessage(chatId, {
            document: { url: downloadUrl },
            fileName: `${app.name}.apk`,
            mimetype: 'application/vnd.android.package-archive',
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: app.name,
                    body: `${sizeMB} MB - APK Downloader`,
                    mediaType: 1,
                    sourceUrl: downloadUrl,
                    thumbnailUrl: app.icon,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }
        }, { quoted: message });

        // Increment download count
        const remaining = incrementDownload(senderId);

        // Final reaction
        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

        // Show remaining downloads
        const remainingMsg = userLang === 'ma'
            ? `✅ *تم التحميل بنجاح!*\n📊 *المتبقي اليوم:* ${remaining}/${DAILY_LIMIT}`
            : userLang === 'ar'
                ? `✅ *تم التحميل بنجاح!*\n📊 *المتبقي اليوم:* ${remaining}/${DAILY_LIMIT}`
                : `✅ *Download Successful!*\n📊 *Remaining Today:* ${remaining}/${DAILY_LIMIT}`;

        await sock.sendMessage(chatId, { text: remainingMsg }, { quoted: message });


    } catch (error) {
        console.error('Error in apk command:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });

        let errorMsg = userLang === 'ma' ? "❌ *وقع مشكل ف التحميل.*" : "❌ *Error downloading APK.*";
        if (error.response && error.response.status === 404) {
            errorMsg = userLang === 'ma' ? "❌ *التطبيق ما بقاش متوفر.*" : "❌ *App not found.*";
        } else if (error.response && error.response.status === 400) {
            errorMsg = userLang === 'ma' ? "❌ *البحث مخربق (Bad Request). تأكد من السمية.*" : "❌ *Bad Request. Check the app name.*";
        }

        await sendWithChannelButton(sock, chatId, errorMsg, message);
    }



}

module.exports = apkCommand;
