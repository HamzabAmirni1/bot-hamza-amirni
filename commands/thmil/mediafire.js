const { sendWithChannelButton } = require('../../lib/channelButton');
const axios = require('axios');
const cheerio = require('cheerio');
const { t } = require('../../lib/language');
const settings = require('../../settings');

// Extract the MediaFire file key from any URL format
function extractMediaFireKey(url) {
    // e.g. /file/FILEKEY/filename/file  or  /download/FILEKEY/
    const match = url.match(/mediafire\.com\/(?:file|download)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Strategy 1: Use MediaFire's public JSON API (most reliable)
async function getInfoViaAPI(fileKey) {
    const apiUrl = `https://www.mediafire.com/api/1.5/file/get_info.php?quick_key=${fileKey}&response_format=json`;
    const res = await axios.get(apiUrl, { timeout: 15000 });
    const file = res.data?.response?.file_info;
    if (!file) throw new Error('API returned no file info');
    return {
        url: file.links?.normal_download || file.links?.download,
        fileName: file.filename || 'file',
        fileSize: file.size ? (parseInt(file.size) / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown',
        fileType: file.filetype || (file.filename || 'file').split('.').pop()
    };
}

// Strategy 2: Scrape HTML page (fallback with updated selectors)
async function getInfoViaHTML(url) {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
    const res = await axios.get(url, { headers, timeout: 20000 });
    const $ = cheerio.load(res.data);

    // Updated selectors for modern MediaFire layout
    const downloadUrl =
        $('a#downloadButton').attr('href') ||
        $('a.btn-green-background').attr('href') ||
        $('[data-url]').attr('data-url');

    const fileName =
        $('a#downloadButton').attr('aria-label') ||
        $('div.filename').text().trim() ||
        $('span.name').text().trim() ||
        'file';

    const fileSize =
        $('li.size').text().trim().replace('Size: ', '') ||
        $('span.file-size').text().trim() ||
        'Unknown';

    if (!downloadUrl) throw new Error('Could not find download link in HTML');
    return { url: downloadUrl, fileName, fileSize, fileType: fileName.split('.').pop() };
}

async function getMediaFireDownload(url) {
    const fileKey = extractMediaFireKey(url);

    // Try API first if we have a key
    if (fileKey) {
        try {
            const info = await getInfoViaAPI(fileKey);
            if (info.url) return { ...info, originalUrl: url };
        } catch (e) {
            console.log('[MediaFire] API failed, trying HTML scrape:', e.message);
        }
    }

    // Fallback to HTML scraping
    try {
        const info = await getInfoViaHTML(url);
        return { ...info, originalUrl: url };
    } catch (e) {
        console.error('[MediaFire] HTML fallback failed:', e.message);
        throw new Error('Could not extract download link from MediaFire');
    }
}

async function mediafireCommand(sock, chatId, message, args, commands, userLang) {
    const url = args.join(' ').trim();

    if (!url) {
        await sendWithChannelButton(sock, chatId, t('download.mediafire_usage', {}, userLang), message);
        return;
    }

    // Check if it's a valid MediaFire URL
    if (!url.includes('mediafire.com')) {
        await sendWithChannelButton(sock, chatId, t('download.mediafire_invalid', {}, userLang), message);
        return;
    }

    try {
        await sendWithChannelButton(sock, chatId, t('download.mediafire_processing', {}, userLang), message);

        // Get download info
        const fileInfo = await getMediaFireDownload(url);

        if (!fileInfo.url) {
            await sendWithChannelButton(sock, chatId, t('download.mediafire_error', {}, userLang), message);
            return;
        }

        // Send file info
        const infoMsg = t('download.mediafire_info', {
            name: fileInfo.fileName,
            size: fileInfo.fileSize,
            type: fileInfo.fileType
        }, userLang);

        await sendWithChannelButton(sock, chatId, infoMsg, message);

        // Download using streams (memory safe)
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const safeFileName = fileInfo.fileName.replace(/[\\/:*?"<>|]/g, '_');
        const tempFile = path.join(tempDir, safeFileName);

        try {
            // Check size before downloading (Stability)
            const headRes = await axios.head(fileInfo.url, { timeout: 15000 }).catch(() => null);
            const contentLength = headRes ? headRes.headers['content-length'] : null;
            const maxSize = 300 * 1024 * 1024; // 300MB

            if (contentLength && parseInt(contentLength) > maxSize) {
                const largeMsg = userLang === 'ma'
                    ? `⚠️ *الملف كبير بزاف (${fileInfo.fileSize}).* الحد الأقصى هو 300 ميجا.`
                    : userLang === 'ar'
                        ? `⚠️ *الملف كبير جداً (${fileInfo.fileSize}).* الحد الأقصى هو 300 ميجا.`
                        : `⚠️ *File too large (${fileInfo.fileSize}).* Limit is 300MB.`;
                return await sendWithChannelButton(sock, chatId, largeMsg, message);
            }

            const writer = fs.createWriteStream(tempFile);

            const downloadResponse = await axios({
                url: fileInfo.url,
                method: 'GET',
                responseType: 'stream',
                timeout: 900000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            downloadResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Determine mimetype
            let mimetype = 'application/octet-stream';
            const ext = fileInfo.fileName.split('.').pop().toLowerCase();

            const mimetypes = {
                'apk': 'application/vnd.android.package-archive',
                'zip': 'application/zip',
                'rar': 'application/x-rar-compressed',
                'pdf': 'application/pdf',
                'mp3': 'audio/mpeg',
                'mp4': 'video/mp4',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'txt': 'text/plain',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'ppt': 'application/vnd.ms-powerpoint',
                'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            };

            if (mimetypes[ext]) {
                mimetype = mimetypes[ext];
            }

            // Post-download size check for extra safety
            const stats = fs.statSync(tempFile);
            if (stats.size > 300 * 1024 * 1024) {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                throw new Error('File too large (post-download)');
            }

            // Send the file from path
            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: fileInfo.fileName,
                mimetype: mimetype,
                caption: t('download.mediafire_success', {
                    name: fileInfo.fileName,
                    size: fileInfo.fileSize,
                    botName: settings.botName
                }, userLang)
            }, { quoted: message });

        } catch (error) {
            console.error('Error in mediafire command:', error);
            let errorMsg = t('download.mediafire_error', {}, userLang);

            if (error.message.includes('large') || error.message.includes('300MB') || error.message.includes('99MB')) {
                errorMsg = userLang === 'ma'
                    ? `⚠️ *الملف كبير بزاف.* الحد الأقصى هو 300 ميجا.`
                    : t('download.mediafire_error_large', {}, userLang);
            } else if (error.message.includes('timeout')) {
                errorMsg = t('download.apk_error_timeout', {}, userLang);
            } else if (error.response && error.response.status === 404) {
                errorMsg = t('download.mediafire_invalid', {}, userLang);
            }

            await sendWithChannelButton(sock, chatId, errorMsg, message);
        } finally {
            // Cleanup after sending
            setTimeout(() => {
                if (fs.existsSync(tempFile)) {
                    try { fs.unlinkSync(tempFile); } catch (e) { }
                }
            }, 30000);
        }
    } catch (e) {
        console.error('Outer MediaFire Error:', e);
    }
}

module.exports = mediafireCommand;
