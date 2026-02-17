const https = require('https');
const settings = require('../settings');
const { sendWithChannelButton } = require('../lib/channelButton');
const { t } = require('../lib/language');

/**
 * Generate a random ID for the request
 */
function generateId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * AI Core - Jadve Implementation
 * Model: gpt-5-mini
 */
function JadveAI(message, prompt = 'You are a helpful assistant', options = {}) {
    return new Promise((resolve, reject) => {
        const {
            model = 'gpt-5-mini',
            botId = '',
            chatId = '',
            stream = true,
            returnTokensUsage = true,
            useTools = true
        } = options;

        const requestId = generateId(16);

        const postData = JSON.stringify({
            id: requestId,
            messages: [
                {
                    role: 'assistant',
                    content: [{ type: 'text', text: prompt }]
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: message }]
                }
            ],
            model,
            botId,
            chatId,
            stream,
            returnTokensUsage,
            useTools
        });

        const requestOptions = {
            hostname: 'ai-api.jadve.com',
            port: 443,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Origin': 'https://jadve.com',
                'Referer': 'https://jadve.com/'
            }
        };

        const req = https.request(requestOptions, res => {
            let buffer = '';
            let fullResponse = '';
            let messageId = '';
            let usage = {};

            res.on('data', chunk => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');

                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    try {
                        if (line.startsWith('f:')) {
                            messageId = JSON.parse(line.slice(2)).messageId;
                        } else if (line.startsWith('0:')) {
                            fullResponse += JSON.parse(line.slice(2));
                        } else if (line.startsWith('e:') || line.startsWith('d:')) {
                            const parsed = JSON.parse(line.slice(2));
                            if (parsed.usage) usage = parsed.usage;
                        }
                    } catch (e) {
                        // Ignore partial chunk parsing errors
                    }
                }

                buffer = lines[lines.length - 1];
            });

            res.on('end', () => {
                resolve({ messageId, response: fullResponse, usage });
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Main Command Handler
 */
async function aiCommand(sock, chatId, msg, args, commands, userLang) {
    const text = args.join(' ').trim();

    if (!text) {
        return await sock.sendMessage(chatId, { text: t('ai.provide_prompt', {}, userLang) }, { quoted: msg });
    }

    try {
        // Send reaction to show processing
        await sock.sendMessage(chatId, { react: { text: "🧠", key: msg.key } });

        const result = await JadveAI(text);

        if (!result.response) {
            throw new Error("Empty response from AI service");
        }

        const caption = `${t('ai.response_title', {}, userLang)}\n\n${result.response}\n\n⚔️ ${t('common.botName', {}, userLang)}`;

        await sock.sendMessage(chatId, { text: caption }, { quoted: msg });

        // Final status reaction
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error('AI Command Error:', err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sock.sendMessage(chatId, { text: t('ai.error', {}, userLang) }, { quoted: msg });
    }
}

module.exports = aiCommand;
