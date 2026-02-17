const settings = require('../settings');
const axios = require('axios');
const { translateToEn } = require('../lib/translate');
const { t } = require('../lib/language');

async function imagineCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        const text = args.join(' ');

        if (!text) {
            const description = getCommandDescription('imagine');
            return sock.sendMessage(chatId, { text: t('ai.provide_prompt', {}, userLang) }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: t('ai.wait', {}, userLang) }, { quoted: msg });

        // Using a highly reliable API (Pollinations but with Flux model style for .imagine)
        const enPrompt = await translateToEn(text);
        const prompt = encodeURIComponent(enPrompt + ", ultra realistic, 8k resolution, cinematic lighting");
        const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux`;

        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(response.data, 'binary');

        await sock.sendMessage(chatId, {
            image: buffer,
            caption: `⚔️ *${settings.botName} Imagine* ✨\n\n📝 *الطلب:* ${text}\n👤 *بواسطة:* Hamza Amirni\n🔥 *الدقة:* 4K Ultra HD`
        }, { quoted: msg });

    } catch (err) {
        console.error('Imagine Error:', err);
        await sock.sendMessage(chatId, { text: t('ai.error', {}, userLang) }, { quoted: msg });
    }
}

module.exports = imagineCommand;
