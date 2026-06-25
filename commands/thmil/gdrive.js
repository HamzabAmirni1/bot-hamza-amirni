const { sendWithChannelButton } = require('../../lib/channelButton');
const axios = require('axios');
const { t } = require('../../lib/language');
const settings = require('../../settings');

/**
 * Extract Google Drive file ID from any Google Drive URL format
 * Supports:
 *  - https://drive.google.com/file/d/FILE_ID/view
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/uc?id=FILE_ID
 *  - https://docs.google.com/.../.../d/FILE_ID/...
 *  - https://drive.google.com/drive/folders/... (not a file, will fail gracefully)
 */
function extractGDriveId(url) {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]{15,})/,   // /file/d/{id}
        /[?&]id=([a-zA-Z0-9_-]{15,})/,          // ?id= or &id=
        /\/d\/([a-zA-Z0-9_-]{15,})/,             // /d/{id} (Google Docs etc.)
        /open\?id=([a-zA-Z0-9_-]{15,})/          // open?id=
    ];
    for (const re of patterns) {
        const m = url.match(re);
        if (m) return m[1];
    }
    return null;
}

/**
 * Get file metadata via the unofficial gdown-style API
 * This endpoint returns JSON with the direct download URL
 */
async function getGDriveInfo(fileId) {
    const metaUrl = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t`;

    // Attempt 1: yt-dlp style info extraction via gdl.ggdownloader.com (public proxy)
    const proxies = [
        `https://gdl.ggdownloader.com/api/download?id=${fileId}`,
        `https://downloader.disk.yandex.ru/disk/gdriveapi/?id=${fileId}`, // won't work but placeholder
    ];

    // Attempt 1: Use drive.usercontent.google.com (works for files < 100MB without virus scan)
    const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&authuser=0`;

    // First do a HEAD request to grab filename & size
    let fileName = 'file';
    let fileSizeBytes = 0;
    let mimeType = 'application/octet-stream';

    try {
        const headRes = await axios.head(directUrl, {
            timeout: 15000,
            maxRedirects: 10,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
            }
        });
        const cd = headRes.headers['content-disposition'] || '';
        const fnMatch = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)/i);
        if (fnMatch) fileName = decodeURIComponent(fnMatch[1].trim().replace(/["']/g, ''));
        fileSizeBytes = parseInt(headRes.headers['content-length'] || '0');
        mimeType = headRes.headers['content-type'] || mimeType;
    } catch (_) { /* ignore, we'll still try to download */ }

    const fileSizeMB = fileSizeBytes > 0
        ? (fileSizeBytes / 1024 / 1024).toFixed(2) + ' MB'
        : 'غير معروف';

    return { directUrl, fileName, fileSizeMB, fileSizeBytes, mimeType };
}

/**
 * Try alternative public mirrors/scrapers if direct fails
 */
async function getGDriveInfoViaGdl(fileId) {
    // gdl.ggdownloader.com is a popular open-source Google Drive link resolver
    const apis = [
        `https://api.gdl.ggdownloader.com/v1/drive?id=${fileId}`,
        `https://gdrivedl.bsky.sh/api/download?id=${fileId}`,
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api, { timeout: 12000 });
            const data = res.data;
            if (data?.downloadUrl || data?.url || data?.link) {
                return {
                    directUrl: data.downloadUrl || data.url || data.link,
                    fileName: data.fileName || data.name || 'file',
                    fileSizeMB: data.size || 'غير معروف',
                    fileSizeBytes: 0,
                    mimeType: 'application/octet-stream'
                };
            }
        } catch (_) { /* try next */ }
    }
    return null;
}

async function gdriveCommand(sock, chatId, msg, args, commands, userLang) {
    const url = args[0];

    if (!url) {
        return await sock.sendMessage(chatId, {
            text:
                `📂 *تحميل ملف من Google Drive*\n\n` +
                `الاستخدام:\n` +
                `\`\`\`${settings.prefix}gdrive [رابط Google Drive]\`\`\`\n\n` +
                `مثال:\n` +
                `\`\`\`${settings.prefix}gdrive https://drive.google.com/file/d/ABC123/view\`\`\``
        }, { quoted: msg });
    }

    // Validate URL
    if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
        return await sock.sendMessage(chatId, {
            text: '❌ الرابط غير صالح. يجب أن يكون رابط Google Drive صحيح.'
        }, { quoted: msg });
    }

    const fileId = extractGDriveId(url);
    if (!fileId) {
        return await sock.sendMessage(chatId, {
            text: '❌ تعذّر استخراج معرّف الملف من الرابط. تأكد من صحة الرابط.'
        }, { quoted: msg });
    }

    // Notify user we're working on it
    await sock.sendMessage(chatId, {
        react: { text: '⏳', key: msg.key }
    });

    try {
        // Get file info
        let info = await getGDriveInfo(fileId);

        // If direct URL doesn't have a proper filename, try alt API
        if (!info || info.fileName === 'file') {
            const altInfo = await getGDriveInfoViaGdl(fileId);
            if (altInfo) info = altInfo;
        }

        const { directUrl, fileName, fileSizeMB, fileSizeBytes, mimeType } = info;

        // Size limit — Google Drive large files get a virus scan warning page
        // We send a threshold warning at 50 MB
        const SIZE_LIMIT_MB = 50;
        const sizeMBNum = parseFloat(fileSizeMB);
        if (fileSizeBytes > SIZE_LIMIT_MB * 1024 * 1024) {
            // Send direct link instead of buffering
            return await sendWithChannelButton(sock, chatId,
                `📂 *ملف Google Drive*\n\n` +
                `📄 *الاسم:* ${fileName}\n` +
                `📦 *الحجم:* ${fileSizeMB}\n\n` +
                `⚠️ الملف كبير جدًا للإرسال المباشر عبر واتساب (أكثر من ${SIZE_LIMIT_MB} MB).\n` +
                `📥 يمكنك تحميله مباشرةً من هذا الرابط:\n${directUrl}`,
                msg, {}, userLang
            );
        }

        // Download file to buffer
        await sock.sendMessage(chatId, {
            text: `⬇️ جاري تحميل *${fileName}* (${fileSizeMB})...`
        }, { quoted: msg });

        const dlRes = await axios.get(directUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: SIZE_LIMIT_MB * 1024 * 1024 + 5 * 1024 * 1024,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
                'Accept': '*/*'
            },
            maxRedirects: 10
        });

        const buffer = Buffer.from(dlRes.data);

        // Sanity check — reject suspiciously small files (HTML error pages)
        if (buffer.length < 5 * 1024) {
            // Might be a virus scan page or access denied HTML
            return await sendWithChannelButton(sock, chatId,
                `❌ فشل التحميل — الملف ربما خاص (Private) أو يتطلب إذناً للوصول.\n\n` +
                `🔗 جرب فتح الرابط يدوياً:\n${directUrl}`,
                msg, {}, userLang
            );
        }

        // Determine send method based on MIME type
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');
        const isPDF   = mimeType === 'application/pdf';

        const caption = `✅ *${fileName}*\n📦 الحجم: ${fileSizeMB}\n\n_${settings.botName}_`;

        if (isImage) {
            await sock.sendMessage(chatId, {
                image: buffer,
                caption,
                fileName
            }, { quoted: msg });
        } else if (isVideo) {
            await sock.sendMessage(chatId, {
                video: buffer,
                mimetype: mimeType,
                caption,
                fileName
            }, { quoted: msg });
        } else if (isAudio) {
            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: mimeType,
                fileName
            }, { quoted: msg });
        } else {
            // Document fallback (APK, ZIP, PDF, etc.)
            await sock.sendMessage(chatId, {
                document: buffer,
                mimetype: mimeType || 'application/octet-stream',
                fileName,
                caption
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('[GDRIVE] Error:', error.message);

        let errMsg = `❌ فشل تحميل الملف من Google Drive.\n\n`;
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            errMsg += '🔒 الملف محمي أو خاص — تأكد أن الملف مشارك للعموم (Anyone with the link can view).';
        } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            errMsg += '🔍 الملف غير موجود أو تم حذفه.';
        } else if (error.message?.includes('timeout')) {
            errMsg += '⏱️ انتهت مهلة الاتصال — حاول مرة أخرى.';
        } else {
            errMsg += `خطأ: ${error.message}`;
        }

        await sock.sendMessage(chatId, { text: errMsg }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = gdriveCommand;
