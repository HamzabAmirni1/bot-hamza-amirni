const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { uploadImage } = require('../lib/uploadImage');
const { translateToEn } = require('../lib/translate');
const { t } = require('../lib/language');


async function generatePollinations(prompt, model = "flux", opts = {}) {
    const {
        width = 960,
        height = 1280,
        seed = Math.floor(Math.random() * 999999),
        nologo = true,
        enhance = true,
        hidewatermark = true,
    } = opts;

    try {
        // Translate prompt to English for better results with Pollinations AI
        const enPrompt = await translateToEn(prompt);

        const query = new URLSearchParams({
            model,
            width,
            height,
            seed,
        });

        if (nologo) query.set("nologo", "true");
        if (enhance) query.set("enhance", "true");
        if (hidewatermark) query.set("hidewatermark", "true");

        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
            enPrompt
        )}?${query.toString()}`;

        console.log(`[GenAI] Generating image with Pollinations: ${url.substring(0, 100)}...`);

        const res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 60000, // 60 seconds timeout
        });

        console.log(`[GenAI] ✅ Image generated successfully (${res.data.length} bytes)`);
        return Buffer.from(res.data, "binary");
    } catch (err) {
        console.error("❌ Pollinations AI failed:", err.message);
        throw err;
    }
}

// Fallback: Hercai API
async function generateHercai(prompt) {
    try {
        const enPrompt = await translateToEn(prompt);
        console.log(`[GenAI] Trying fallback Hercai API...`);

        const url = `https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(enPrompt)}`;
        const res = await axios.get(url, { timeout: 60000 });

        if (res.data && res.data.url) {
            console.log(`[GenAI] ✅ Hercai generated image URL: ${res.data.url}`);
            // Download the image
            const imgRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 30000 });
            return Buffer.from(imgRes.data, 'binary');
        }
        throw new Error('No image URL in Hercai response');
    } catch (err) {
        console.error("❌ Hercai API also failed:", err.message);
        throw err;
    }
}

// --- Main Handler ---
async function genaiCommand(sock, chatId, msg, args, commands, userLang) {
    const message = msg; // Compatibility alias
    try {
        // 1. Check if it's an image analysis request (reply to image or image with caption)
        let targetMessage = message;
        let isImage = message.message?.imageMessage;

        if (!isImage && message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            const quotedInfo = message.message.extendedTextMessage.contextInfo;
            targetMessage = {
                key: { remoteJid: chatId, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
                message: quotedInfo.quotedMessage
            };
            isImage = true;
        }

        if (isImage) {
            const query = (Array.isArray(args) ? args.join(' ') : args) || 'describe this image';

            await sock.sendMessage(chatId, { react: { text: "🔍", key: message.key } });

            try {
                // Download image
                const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
                    logger: undefined,
                    reuploadRequest: sock.updateMediaMessage
                });

                // Upload to get URL
                const imageUrl = await uploadImage(buffer);

                // Use Gemini Vision API
                const apiUrl = `https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(`${query}\n\nImage URL: ${imageUrl}`)}&model=gemini-vision`;

                const response = await axios.get(apiUrl);

                if (response.data && response.data.success && response.data.message?.content) {
                    const answer = response.data.message.content;
                    await sock.sendMessage(chatId, { text: `🤖 *GenAI Vision:*\n\n${answer}` }, { quoted: message });
                } else {
                    // Fallback to text if vision fails
                    const fallbackUrl = `https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(`${query} (context: user sent an image. describe it if possible)`)}&model=deepseek`;
                    const fallbackRes = await axios.get(fallbackUrl);
                    if (fallbackRes.data?.success) {
                        await sock.sendMessage(chatId, { text: `🤖 *GenAI:*\n\n${fallbackRes.data.message.content}` }, { quoted: message });
                    }
                }
                return;
            } catch (err) {
                console.error('Vision Error:', err);
                return await sock.sendMessage(chatId, { text: t('ai.error', {}, userLang) }, { quoted: message });
            }
        }

        // 2. Image Generation Logic
        const text = Array.isArray(args) ? args.join(' ') : args;

        if (!text || text.trim().length === 0) {
            return await sock.sendMessage(chatId, { text: t('ai.provide_prompt', {}, userLang) }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: t('ai.wait', {}, userLang)
        }, { quoted: message });

        const availableModels = ['flux', 'sdxl', 'midjourney', 'anime', 'realistic', 'turbo'];
        let model = 'flux'; // Default model
        let prompt = text.trim();

        // Check if the user specified a model using the '|' separator
        if (text.includes('|')) {
            const parts = text.split('|');
            const potentialModel = parts[0].trim().toLowerCase();
            if (availableModels.includes(potentialModel)) {
                model = potentialModel;
                prompt = parts.slice(1).join('|').trim();
            }
        }

        if (!prompt) {
            return await sock.sendMessage(chatId, {
                text: t('ai.provide_prompt', {}, userLang)
            }, { quoted: message });
        }

        let imageBuffer;
        let usedApi = 'Pollinations';

        try {
            // Try Pollinations first
            imageBuffer = await generatePollinations(prompt, model);
        } catch (pollinationsError) {
            console.log('[GenAI] Pollinations failed, trying Hercai fallback...');
            try {
                // Fallback to Hercai (doesn't support model selection)
                imageBuffer = await generateHercai(prompt);
                usedApi = 'Hercai';
            } catch (hercaiError) {
                // Both APIs failed
                return await sock.sendMessage(chatId, {
                    text: t('ai.error', {}, userLang)
                }, { quoted: message });
            }
        }

        // Send the generated image back to the user
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `✅ *تم إنشاء الصورة بنجاح!*\r\n\r\n🤖 *API:* ${usedApi}${usedApi === 'Pollinations' ? `\n🎨 *النموذج:* ${model}` : ''}\r\n📝 *الوصف:* ${prompt}\r\n\r\n⚔️ ${settings.botName}`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in genai command:', error);
        await sock.sendMessage(chatId, {
            text: t('ai.error', {}, userLang)
        }, { quoted: message });
    }
}

module.exports = genaiCommand;
