const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { fileTypeFromBuffer } = require('file-type');

/**
 * Upload buffer to catbox.moe
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function uploadToCatbox(buffer) {
    try {
        const { ext, mime } = await fileTypeFromBuffer(buffer) || { ext: 'bin', mime: 'application/octet-stream' };
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: `file.${ext}`, contentType: mime });

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading to Catbox:', error.message);
        return null; // Return null on failure so we can try fallback
    }
}

/**
 * Upload buffer to tmpfiles.org
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function uploadToTmpfiles(buffer) {
    try {
        const { ext, mime } = await fileTypeFromBuffer(buffer) || { ext: 'bin', mime: 'application/octet-stream' };
        const form = new FormData();
        form.append('file', buffer, { filename: `file.${ext}`, contentType: mime });

        const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        // Tmpfiles returns a URL like https://tmpfiles.org/12345/file.jpg
        // But the direct download link is https://tmpfiles.org/dl/12345/file.jpg
        const url = response.data.data.url;
        const directUrl = url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');

        return directUrl;
    } catch (error) {
        console.error('Error uploading to Tmpfiles:', error.message);
        return null;
    }
}

module.exports = { uploadToCatbox, uploadToTmpfiles };
