const DailyAPI = require('../../lib/dailyApi');
const { sendWithChannelButton } = require('../../lib/channelButton');
const { translateToEn } = require('../../lib/translate');
const { t } = require('../../lib/language');

async function ghibliCommand(sock, chatId, msg, args, commands, userLang) {
    const prompt = args.join(' ').trim();

    if (!prompt) {
        const helpMsg = `🎨 *مولد رسومات جيبلي (Ghibli)* 🎨

🔹 *الاستخدام:*
${settings.prefix}ghibli [وصف الصورة]
${settings.prefix}ghibli-art [وصف الصورة]

📝 *مثال:*
${settings.prefix}ghibli A girl standing on a hill watching the sunset.

💡 هذا الأمر يقوم بتحويل وصفك إلى صورة فنية بأسلوب استوديو جيبلي الشهير.

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        await sendWithChannelButton(sock, chatId, t('ai.wait', {}, userLang), msg);

        // Translate prompt to English for better AI results
        const translatedPrompt = await translateToEn(prompt);

        const api = new DailyAPI();
        const result = await api.generate({
            mode: 'ghibli',
            prompt: translatedPrompt
        });

        if (result.error) {
            throw new Error(result.msg);
        }

        if (result.success && result.buffer) {
            await sock.sendMessage(chatId, {
                image: result.buffer,
                caption: `✨ *تم توليد فن جيبلي بنجاح!*\n\n📝 *الوصف:* ${prompt}\n\n⚔️ ${settings.botName}`
            }, { quoted: msg });
        } else {
            throw new Error("لم يتم استلام أي صورة من الخادم.");
        }

    } catch (error) {
        console.error('Error in Ghibli command:', error);
        await sendWithChannelButton(sock, chatId, t('ai.error', {}, userLang) + `\n⚠️ السبب: ${error.message || 'خطأ غير معروف'}`, msg);
    }
}

module.exports = ghibliCommand;
