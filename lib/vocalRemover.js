const axios = require('axios');
const FormData = require('form-data');

const apii = axios.create({ baseURL: 'https://aivocalremover.com' });

const getKey = async () => {
    const res = await apii.get('/');
    const match = res.data.match(/key:"(\w+)/);
    if (!match) throw new Error("Could not find API key on the page.");
    return match[1];
};

const vocalRemove = async (audioBuffer) => {
    const form = new FormData();
    const fileName = Math.random().toString(36) + '.mpeg';
    // The user's code had form.append('fileName', audioBuffer, fileName)
    // Note: In FormData, the field name is usually 'file' or similar, but I'll stick to what was provided if it worked.
    form.append('fileName', audioBuffer, {
        filename: fileName,
        contentType: 'audio/mpeg'
    });

    const [key, fileUpload] = await Promise.all([
        getKey(),
        apii.post('/api/v2/FileUpload', form, { headers: form.getHeaders() }).catch(e => e.response)
    ]);

    if (!fileUpload || fileUpload.status !== 200) {
        throw new Error(fileUpload?.data?.message || fileUpload?.statusText || "Upload failed");
    }

    const processFile = await apii.post('/api/v2/ProcessFile', new URLSearchParams({
        file_name: fileUpload.data.file_name,
        action: 'watermark_video',
        key: key,
        web: 'web'
    })).catch(e => e.response);

    if (!processFile || processFile.status !== 200) {
        throw new Error(processFile?.data?.message || "Processing failed");
    }

    return processFile.data; // Should contain vocal_path and instrumental_path
};

module.exports = { vocalRemove };
