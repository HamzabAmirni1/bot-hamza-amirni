const axios = require('axios');
const FormData = require('form-data');
const settings = require('../settings');

async function getObitoAnalyze(buffer, prompt, mime = 'image/jpeg') {
    try {
        const body = new FormData();
        body.append("image", buffer, { filename: "image.jpg", contentType: mime });
        body.append("prompt", prompt);

        const { data } = await axios.post("https://api.obito.my.id/api/vision", body, {
            headers: body.getHeaders(),
            timeout: 30000
        });
        return data.result;
    } catch (e) {
        console.error('Obito Vision Error:', e.message);
        return null;
    }
}

async function getPollinationsResponse(jid, message) {
    try {
        const { data } = await axios.post("https://text.pollinations.ai/", {
            messages: [
                { role: "system", content: "You are a helpful AI assistant." },
                { role: "user", content: message }
            ],
            model: "openai",
            code: "hamza-amirni-bot",
            jsonMode: false
        }, { timeout: 15000 });

        let cleanResponse = typeof data === 'string' ? data : JSON.stringify(data);
        return cleanResponse.replace(/\*Support Pollinations\.AI:\*[\s\S]*$/, '').trim();
    } catch (e) {
        return null;
    }
}

module.exports = {
    getObitoAnalyze,
    getPollinationsResponse
};
