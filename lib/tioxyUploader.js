const fetch = require('node-fetch');
const FormData = require('form-data');
const { fileTypeFromBuffer } = require('file-type');

/**
 * Upload buffer to Tioxy CDN
 * @param {Buffer} buffer 
 * @returns {Promise<Object>}
 */
module.exports = async (buffer) => {
    try {
        const fileType = await fileTypeFromBuffer(buffer);
        const { ext, mime } = fileType || { ext: 'bin', mime: 'application/octet-stream' };

        const form = new FormData();
        form.append('file', buffer, {
            filename: 'tmp.' + ext,
            contentType: mime
        });

        const res = await fetch('https://cdn.tioxy.my.id/api/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const result = await res.json();
        return result;
    } catch (e) {
        console.error('Tioxy Upload Error:', e);
        throw e;
    }
};
