const axios = require("axios");
const { t } = require('../lib/language');
const settings = require('../settings');

async function gptCommand(sock, chatId, message, args, commands, userLang, match) {
    // Determine which model to use based on the command name called (via aliases or direct call)
    // We can check message.body to see what was actually typed if needed, 
    // but better to pass the model as a parameter or detect it from args.

    let model = 'gpt-4o'; // Default
    let commandCalled = '';

    // Attempt to detect command from message text
    const text = message.body || '';
    const prefix = settings.prefix;
    if (text.startsWith(prefix)) {
        commandCalled = text.slice(prefix.length).split(' ')[0].toLowerCase();
    }

    // Map command called to specific models
    const modelMap = {
        'gpt3': 'gpt-3.5-turbo',
        'gpt4': 'gpt-4',
        'gpt4t': 'gpt-4-turbo',
        'gpt4o': 'gpt-4o',
        'gpt4om': 'gpt-4o-mini',
        'o1': 'o1-preview',
        'o1m': 'o1-mini'
    };

    if (modelMap[commandCalled]) {
        model = modelMap[commandCalled];
    } else if (commandCalled === 'gpt' && args[0] && modelMap[args[0].toLowerCase()]) {
        // Support .gpt gpt4o [query]
        model = modelMap[args[0].toLowerCase()];
        args.shift();
    }

    try {
        const query = Array.isArray(args) ? args.join(' ') : args;

        if (!query || query.trim().length === 0) {
            const helpMsg = t('gpt.help', {
                model,
                prefix,
                command: commandCalled || 'gpt',
                botName: t('common.botName', {}, userLang)
            }, userLang);

            return await sock.sendMessage(chatId, {
                text: helpMsg
            }, { quoted: message });
        }

        // React with 🤖 while processing
        await sock.sendMessage(chatId, {
            react: { text: "🤖", key: message.key }
        });

        const apiUrl = `https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(query)}&model=${model}`;

        const response = await axios.get(apiUrl);

        if (response.data && response.data.success && response.data.message?.content) {
            const answer = response.data.message.content;
            const caption = `${t('gpt.result_title', { model }, userLang)}\n\n${answer}`;
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });

            // Success reaction
            await sock.sendMessage(chatId, {
                react: { text: "✅", key: message.key }
            });
        } else {
            throw new Error("Invalid GPT response");
        }
    } catch (error) {
        console.error("GPT API Error:", error.message);
        await sock.sendMessage(chatId, { text: t('gpt.error', {}, userLang) }, { quoted: message });
        await sock.sendMessage(chatId, {
            react: { text: "❌", key: message.key }
        });
    }
}

module.exports = gptCommand;
