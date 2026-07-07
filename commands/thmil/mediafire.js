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
            // Only accept direct download links, not the /file/ preview page URLs
            if (info.url && !info.url.includes('/file/')) {
                return { ...info, originalUrl: url };
            } else {
                console.log('[MediaFire] API returned page preview URL instead of direct link. Falling back to HTML scrape.');
            }
        } catch (e) {
            console.log('[MediaFire] API failed, trying HTML scrape:', e.message);
        }
    }

    // Fallback to HTML scraping (which yields the true download link)
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

        // Try to get exact size and name from HEAD request
        let finalFileName = fileInfo.fileName;
        let finalFileSize = fileInfo.fileSize;
        let finalType = fileInfo.fileType;
        let contentLength = null;

        try {
            const headRes = await axios.head(fileInfo.url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            });
            contentLength = headRes.headers['content-length'];
            if (contentLength) {
                const bytes = parseInt(contentLength);
                finalFileSize = (bytes / 1024 / 1024).toFixed(2) + ' MB';
            }
            if (headRes.headers['content-disposition']) {
                const disposition = headRes.headers['content-disposition'];
                const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
                if (filenameMatch) {
                    finalFileName = decodeURIComponent(filenameMatch[1]).replace(/\+/g, ' ');
                    finalType = finalFileName.split('.').pop().toLowerCase();
                }
            }
        } catch (e) {
            console.log('[MediaFire HEAD error]:', e.message);
        }

        if ((!finalFileName || finalFileName === 'file') && fileInfo.url) {
            try {
                const u = new URL(fileInfo.url);
                finalFileName = decodeURIComponent(u.pathname.split('/').pop()).replace(/\+/g, ' ');
                finalType = finalFileName.split('.').pop().toLowerCase();
            } catch (_) {}
        }

        // Send file info
        const infoMsg = t('download.mediafire_info', {
            name: finalFileName,
            size: finalFileSize,
            type: finalType
        }, userLang);

        await sendWithChannelButton(sock, chatId, infoMsg, message);

        // Download using streams (memory safe)
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const safeFileName = finalFileName.replace(/[\\/:*?"<>|]/g, '_');
        const tempFile = path.join(tempDir, safeFileName);

        try {
            const maxSize = 300 * 1024 * 1024; // 300MB

            if (contentLength && parseInt(contentLength) > maxSize) {
                const largeMsg = userLang === 'ma'
                    ? `⚠️ *الملف كبير بزاف (${finalFileSize}).* الحد الأقصى هو 300 ميجا.`
                    : userLang === 'ar'
                        ? `⚠️ *الملف كبير جداً (${finalFileSize}).* الحد الأقصى هو 300 ميجا.`
                        : `⚠️ *File too large (${finalFileSize}).* Limit is 300MB.`;
                return await sendWithChannelButton(sock, chatId, largeMsg, message);
            }

            const writer = fs.createWriteStream(tempFile);

            const downloadResponse = await axios({
                url: fileInfo.url,
                method: 'GET',
                responseType: 'stream',
                timeout: 900000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Encoding': 'identity'
                }
            });

            downloadResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Determine mimetype
            let mimetype = 'application/octet-stream';
            const ext = finalFileName.split('.').pop().toLowerCase();

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
                fileName: finalFileName,
                mimetype: mimetype,
                caption: t('download.mediafire_success', {
                    name: finalFileName,
                    size: finalFileSize,
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
