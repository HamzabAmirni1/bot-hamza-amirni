const { sendWithChannelButton } = require('../lib/channelButton');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);
const { t } = require('../lib/language');
const settings = require('../settings');
const { canDownload, incrementDownload, DAILY_LIMIT } = require('../lib/apkLimiter');

// APK storage per user
const apkSessions = {};

const aptoide = require('../lib/aptoide');

async function apk2Command(sock, chatId, msg, args, commands, userLang) { // Renamed from apkCommand
    const senderId = msg.key.participant || msg.key.remoteJid;
    const message = msg; // For compatibility

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

    const text = args.join(' ').trim();

    if (!text) {
        await sendWithChannelButton(sock, chatId, `Usage: .apk2 [query]\n\n📊 *المتبقي اليوم:* ${limitCheck.remaining}/${DAILY_LIMIT}`, message);
        return;
    }

    // Check if user is selecting from previous search (Logic updated for apk2 context)
    if (text.split('').length <= 2 && !isNaN(text) && apkSessions[senderId]) {
        const session = apkSessions[senderId];

        if (session.downloading) {
            await sendWithChannelButton(sock, chatId, t('download.apk_downloading', {}, userLang), message);
            return;
        }

        const selectedIndex = parseInt(text) - 1;
        if (selectedIndex < 0 || selectedIndex >= session.data.length) {
            await sendWithChannelButton(sock, chatId, t('download.apk_select_invalid', {}, userLang), message);
            return;
        }

        try {
            session.downloading = true;
            const selectedApp = session.data[selectedIndex];

            const sizeMB = selectedApp.sizeMB;

            // Hard limit 300MB
            if (parseFloat(sizeMB) > 300) {
                await sock.sendMessage(chatId, { react: { text: "⚠️", key: message.key } });
                const largeMsg = userLang === 'ma'
                    ? `⚠️ *التطبيق كبير بزاف (${sizeMB} MB). الحد هو 300MB.*`
                    : userLang === 'ar'
                        ? `⚠️ *حجم التطبيق كبير جداً (${sizeMB} MB). الحد هو 300 ميجا.*`
                        : `⚠️ *App too large (${sizeMB} MB). Limit is 300MB.*`;
                return await sendWithChannelButton(sock, chatId, largeMsg, message);
            }

            const isLarge = parseFloat(sizeMB) > 100;

            await sendWithChannelButton(sock, chatId, isLarge
                ? t('download.apk_downloading_large', {}, userLang)
                : t('download.apk_downloading', {}, userLang)
                , message);

            // Send app info image as preview
            if (selectedApp.icon) {
                await sock.sendMessage(chatId, {
                    image: { url: selectedApp.icon },
                    caption: t('download.apk_uploading', {}, userLang) + `\n\n📦 *App:* ${selectedApp.name}\n📏 *Size:* ${sizeMB} MB`
                }, { quoted: message });
            }

            // Download with progress tracking using utility
            let tempPath;
            try {
                tempPath = await aptoide.downloadToFile(selectedApp.downloadUrl);
            } catch (downloadError) {
                if (downloadError.message.includes('large')) {
                    throw new Error(t('download.apk_error_large', {}, userLang));
                }
                throw downloadError;
            }

            // Send file
            await sock.sendMessage(chatId, {
                document: { url: tempPath },
                fileName: `${selectedApp.name}.apk`,
                mimetype: 'application/vnd.android.package-archive',
                caption: t('download.apk_success_caption', {
                    name: selectedApp.name,
                    size: sizeMB + ' MB',
                    botName: settings.botName
                }, userLang)
            }, { quoted: message });

            // Increment download count
            const remaining = incrementDownload(senderId);

            // Show remaining downloads
            const remainingMsg = userLang === 'ma'
                ? `✅ *تم التحميل بنجاح!*\n📊 *المتبقي اليوم:* ${remaining}/${DAILY_LIMIT}`
                : `✅ *Download Successful!*\n📊 *Remaining Today:* ${remaining}/${DAILY_LIMIT}`;

            await sock.sendMessage(chatId, { text: remainingMsg }, { quoted: message });

            // Clean up temp file after sending
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

            session.downloading = false;

        } catch (error) {
            console.error('Error downloading APK:', error);

            // Ensure cleanup even on error
            if (tempPath && fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (cleanupErr) {
                    console.error('Failed to clean up temp file:', cleanupErr);
                }
            }

            let errorMsg = t('common.error', {}, userLang);
            if (error.message.includes('large') || error.message.includes('150MB')) {
                errorMsg = t('download.apk_error_large', {}, userLang);
            } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMsg = t('download.apk_error_timeout', {}, userLang);
            }

            await sendWithChannelButton(sock, chatId, errorMsg, message);
            session.downloading = false;
        }

    } else {
        if (text.length < 2) {
            await sock.sendMessage(chatId, { text: '❌ ' + t('common.error', {}, userLang) }, { quoted: message });
            return;
        }

        await sendWithChannelButton(sock, chatId, t('download.apk_search_wait', {}, userLang), message);

        try {
            const searchResults = await aptoide.search(text);

            if (!searchResults || searchResults.length === 0) {
                await sock.sendMessage(chatId, {
                    text: t('download.apk_search_no_result', { query: text }, userLang)
                }, { quoted: message });
                return;
            }

            // Limit to 10 results
            const limitedResults = searchResults.slice(0, 10);

            let resultText = t('download.apk_search_result_header', { query: text }, userLang);

            limitedResults.forEach((app, index) => {
                const item = t('download.apk_search_result_item', {
                    index: index + 1,
                    name: app.name,
                    size: app.size,
                    version: app.version
                }, userLang);
                resultText += item;
                resultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            });

            resultText += t('download.apk_search_footer', {}, userLang);
            resultText += `\n\n⚔️ ${settings.botName}`;

            await sendWithChannelButton(sock, chatId, resultText, message);

            // Store session
            apkSessions[senderId] = {
                downloading: false,
                data: limitedResults,
                timestamp: Date.now()
            };

            // Auto cleanup after 1 hour
            setTimeout(() => {
                if (apkSessions[senderId]) delete apkSessions[senderId];
            }, 3600000);

        } catch (error) {
            console.error('Error searching APK:', error);
            await sendWithChannelButton(sock, chatId, t('common.error', {}, userLang), message);
        }
    }
}

/**
 * Handles numeric selection without prefix
 */
async function handleSession(sock, chatId, senderId, text, msg, userLang) {
    if (!apkSessions[senderId]) return false;
    if (isNaN(text) || text.length > 2) return false;

    const selectedIndex = parseInt(text) - 1;
    if (selectedIndex >= 0 && selectedIndex < apkSessions[senderId].data.length) {
        // Trigger apk2Command with the number as an argument
        await apk2Command(sock, chatId, msg, [text], null, userLang);
        return true;
    }
    return false;
}

module.exports = {
    execute: apk2Command,
    handleSession
};
