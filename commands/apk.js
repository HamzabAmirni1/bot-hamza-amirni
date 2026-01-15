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
    // Handle Aptoide URLs (for auto-download or copy-paste)
    if (query.includes('aptoide.com')) {
        // Extract package or app name from URL
        // Example: https://facebook-lite.fr.aptoide.com/app -> facebook-lite
        // Example: https://www.aptoide.com/app/com.facebook.lite -> com.facebook.lite
        const urlParts = query.split('/');
        let extracted = '';

        if (query.includes('app/')) {
            extracted = urlParts[urlParts.indexOf('app') + 1];
        } else if (query.includes('.aptoide.com')) {
            const host = new URL(query).hostname;
            extracted = host.split('.')[0];
        }

        if (extracted) {
            console.log(`[APK] Extracted "${extracted}" from Aptoide URL`);
            // We continue with extracted as the query
            const tempQuery = extracted;
            // Note: we don't return here, we let it flow to the search/download logic
            const aptoide = require('../lib/aptoide');
            const app = await aptoide.downloadInfo(tempQuery);
            if (app) {
                // We'll jump to the download part by simulating the rest of the logic
                // Actually, just set query to extracted and continue.
                query = extracted;
            }
        }
    } else if (query.startsWith('http')) {
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

        // Use centralized utility
        const aptoide = require('../lib/aptoide');
        const app = await aptoide.downloadInfo(query);

        if (!app || !app.downloadUrl) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            const notFoundMsg = userLang === 'ma'
                ? `❌ *ما لقيناش "${query}". جرب كتب السمية نيشان.*`
                : userLang === 'ar'
                    ? `❌ *عذراً، لم يتم العثور على "${query}". المرجو التأكد من الاسم.*`
                    : `❌ *No results found for "${query}". Please check the name.*`;
            return await sendWithChannelButton(sock, chatId, notFoundMsg, message);
        }

        const sizeMB = app.sizeMB;

        // Large file warning
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
            ? `🎮 *اسم التطبيق:* ${app.name}\n📦 *الحزمة:* ${app.package}\n📅 *ميزاجور:* ${app.updated}\n📁 *الحجم:* ${sizeMB} MB\n\n🔗 *تابعني (Follow):*\n📸 *Insta:* ${settings.instagram}\n🎥 *YouTube:* ${settings.youtube}\n\n⏬ *هانا كنصيفطو ليك...*\n⚔️ ${settings.botName}`
            : `🎮 *App Name:* ${app.name}\n📦 *Package:* ${app.package}\n📅 *Updated:* ${app.updated}\n📁 *Size:* ${sizeMB} MB\n\n🔗 *Follow Me:*\n📸 *Insta:* ${settings.instagram}\n🎥 *YouTube:* ${settings.youtube}\n\n⏬ *Sending file...*\n⚔️ ${settings.botName}`;

        // Step 2: React with upload icon
        await sock.sendMessage(chatId, { react: { text: "⬆️", key: message.key } });

        // Send the document directly using URL (Baileys handles it well for small files)
        // For larger files or if URL fails, we could use downloadToFile
        try {
            await sock.sendMessage(chatId, {
                document: { url: app.downloadUrl },
                fileName: `${app.name}.apk`,
                mimetype: 'application/vnd.android.package-archive',
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: app.name,
                        body: `${sizeMB} MB - APK Downloader`,
                        mediaType: 1,
                        sourceUrl: app.downloadUrl,
                        thumbnailUrl: app.icon,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            }, { quoted: message });

            // Increment download count
            const remaining = incrementDownload(senderId);
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

            const remainingMsg = userLang === 'ma'
                ? `✅ *تم التحميل بنجاح!*\n📊 *المتبقي اليوم:* ${remaining}/${DAILY_LIMIT}`
                : `✅ *Download Successful!*\n📊 *Remaining Today:* ${remaining}/${DAILY_LIMIT}`;
            await sock.sendMessage(chatId, { text: remainingMsg }, { quoted: message });

        } catch (sendErr) {
            console.log('[APK] Direct URL send failed, trying local download:', sendErr.message);
            const tempPath = await aptoide.downloadToFile(app.downloadUrl);

            await sock.sendMessage(chatId, {
                document: { url: tempPath },
                fileName: `${app.name}.apk`,
                mimetype: 'application/vnd.android.package-archive',
                caption: caption
            }, { quoted: message });

            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

            // Increment download count
            const remaining = incrementDownload(senderId);
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        }

    } catch (error) {
        console.error('Error in apk command:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        const errorMsg = userLang === 'ma' ? "❌ *وقع مشكل ف التحميل. جرب مرة أخرى.*" : "❌ *Error downloading APK.*";
        await sendWithChannelButton(sock, chatId, errorMsg, message);
    }




}

module.exports = apkCommand;
