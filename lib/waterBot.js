const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

class WaterBot {
    constructor() {
        this.base = 'https://37.187.99.30';
        this.path = '/waterbot/api/v1.0/chat';
        this.agent = new https.Agent({ rejectUnauthorized: false });
    }

    genId() {
        const buf = crypto.randomBytes(12);
        return buf
            .toString('base64')
            .replace(/[+/=]/g, m => (m === '+' ? '-' : m === '/' ? '_' : ''))
            .substring(0, 22);
    }

    async chat({ prompt, sid }) {
        const sessionId = sid || this.genId();
        const url = `${this.base}${this.path}`;

        const res = await axios({
            method: 'POST',
            url,
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'id-ID',
                'Content-Type': 'application/json',
                'Origin': this.base,
                'Referer': `${this.base}/`,
                'User-Agent':
                    'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Mobile Safari/537.36',
                'X-Session-Id': sessionId
            },
            data: { prompt },
            httpsAgent: this.agent,
            timeout: 30000
        });

        return {
            result: res?.data || '',
            sid: sessionId
        };
    }
}

module.exports = WaterBot;
