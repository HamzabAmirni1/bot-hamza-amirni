const MiraMuseAI = require('../lib/miraMuseAI');
const { sendWithChannelButton } = require('../lib/channelButton');
const { translateToEn } = require('../lib/translate');
const { t } = require('../lib/language');

async function miramuseCommand(sock, chatId, msg, args, commands, userLang) {
    const text = args.join(' ').trim();

    if (!text) {
        const helpMsg = `🖼️ *مولد الصور MiraMuse AI* 🖼️

أنشئ صوراً احترافية عالية الجودة باستخدام نماذج وأحجام مختلفة.

🔧 *كيفية الاستخدام:*
${settings.prefix}miramuse [الوصف] | [الموديل] | [المقاس]

📝 *مثال:*
${settings.prefix}miramuse beautiful cyberpunk girl | anime | 3:4

📌 *الموديلات المتاحة:*
flux, tamarin, superAnime, visiCanvas, realistic, oldRealistic, anime, 3danime

📌 *المقاسات المتاحة:*
1:2, 9:16, 3:4, 1:1, 4:3, 16:9, 2:1

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    // Split user text
    let [prompt, model, size] = text.split("|").map(v => v?.trim());

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });
        await sendWithChannelButton(sock, chatId, t('ai.wait', {}, userLang), msg);

        const api = new MiraMuseAI();
        const enPrompt = await translateToEn(prompt);
        const result = await api.generate({
            prompt: enPrompt,
            model,
            size
        });

        if (result.result && result.result.length > 0) {
            for (let url of result.result) {
                await sock.sendMessage(chatId, {
                    image: { url: url },
                    caption: `✨ *نتيجة MiraMuse AI* ✨\n\n📝 *الوصف:* ${prompt}\n🎭 *الموديل:* ${model || 'default'}\n📐 *المقاس:* ${size || 'default'}\n\n⚔️ ${settings.botName}`
                }, { quoted: msg });
            }
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } else {
            throw new Error("لم يتم استلام أي برابط للصورة من الخادم.");
        }

    } catch (err) {
        console.error('Error in MiraMuse AI:', err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sendWithChannelButton(sock, chatId, t('ai.error', {}, userLang) + `\n⚠️ السبب: ${err.message || 'خطأ غير معروف'}`, msg);
    }
}

module.exports = miramuseCommand;
