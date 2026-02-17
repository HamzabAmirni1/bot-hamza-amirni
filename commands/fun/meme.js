const axios = require('axios');

async function memeCommand(sock, chatId, message) {
    try {
        // Fetch from r/Morocco or r/MoroccanMemes
        const response = await axios.get('https://meme-api.com/gimme/Morocco');
        const data = response.data;

        if (!data.url) throw new Error('No meme found');

        const buttons = [
            { buttonId: '.meme', buttonText: { displayText: '🎭 ميم آخر' }, type: 1 },
            { buttonId: '.joke', buttonText: { displayText: '😄 نكتة' }, type: 1 }
        ];

        await sock.sendMessage(chatId, {
            image: { url: data.url },
            caption: `> ${data.title}\n\n*Author:* ${data.author}`,
            buttons: buttons,
            headerType: 1,
            footer: 'Hamza Amirni 🤖'
        }, { quoted: message });

    } catch (error) {
        console.error('Error in meme command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ تعذر تحميل الميم. حاول مرة أخرى لاحقاً.'
        }, { quoted: message });
    }
}

module.exports = memeCommand;
