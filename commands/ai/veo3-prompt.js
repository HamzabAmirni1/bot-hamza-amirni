const GeminiService = require('../lib/geminiService');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { t } = require('../lib/language');
const { translateToEn } = require('../lib/translate');

async function veo3PromptCommand(sock, chatId, message, args) {
    const text = args.join(' ').trim();

    if (!text) {
        const helpMsg = t('ai.veo3_help', {
            prefix: settings.prefix,
            botName: settings.botName
        });
        return await sendWithChannelButton(sock, chatId, helpMsg, message);
    }

    try {
        // React with ✨ while processing
        await sock.sendMessage(chatId, {
            react: { text: "✨", key: message.key }
        });

        const gemini = new GeminiService();
        const enPrompt = await translateToEn(text);
        const result = await gemini.generate({ prompt: enPrompt });

        if (result.error) {
            throw new Error(result.error);
        }

        const answer = result.result;
        const responseMsg = t('ai.veo3_result', {
            answer: answer,
            botName: settings.botName
        });

        await sock.sendMessage(chatId, { text: responseMsg }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: "✅", key: message.key }
        });

    } catch (error) {
        console.error("VEO3 Prompt Error:", error.message);
        await sock.sendMessage(chatId, {
            react: { text: "❌", key: message.key }
        });

        let errorMsg = t('ai.veo3_error', { error: error.message });
        if (error.message.includes('429')) {
            errorMsg = "⚠️ *سيرفرات الذكاء الاصطناعي مضغوطة حالياً (Limit Reached).* \nعافاك جرب تاني من بعد ساعة ولا ساعتين. ⏳";
        }

        await sendWithChannelButton(sock, chatId, errorMsg, message);
    }
}

module.exports = veo3PromptCommand;
