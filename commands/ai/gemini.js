const settings = require('../settings');
const { t } = require('../lib/language');

async function geminiCommand(sock, chatId, message, args, commands, userLang) {
    try {
        const query = Array.isArray(args) ? args.join(' ') : args;

        if (!query || query.trim().length === 0) {
            return await sock.sendMessage(chatId, { text: t('gemini.help', { prefix: settings.prefix, botName: settings.botName }, userLang) }, { quoted: message });
        }

        // React with 🤖 while processing
        await sock.sendMessage(chatId, {
            react: { text: "🤖", key: message.key }
        });

        // Send thinking message
        await sock.sendMessage(chatId, { text: t('gemini.loading', {}, userLang) }, { quoted: message });

        const apiUrl = `https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(query)}&model=deepseek`;

        const response = await axios.get(apiUrl, { timeout: 30000 });

        if (response.data && response.data.success && response.data.message?.content) {
            const answer = response.data.message.content;
            await sock.sendMessage(chatId, { text: `🤖 *Gemini:*\n\n${answer}` }, { quoted: message });
        } else {
            throw new Error("Invalid Gemini response");
        }
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        await sock.sendMessage(chatId, { text: t('gemini.error', {}, userLang) }, { quoted: message });
    }
}

module.exports = geminiCommand;
