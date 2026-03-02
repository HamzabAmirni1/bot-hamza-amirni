const axios = require('axios');
const fs = require('fs');

async function calcCommand(sock, chatId, msg, args) {
    if (!args.length) {
        return await sock.sendMessage(chatId, { text: '❌ الرجاء كتابة العملية الحسابية، مثال: .calc 5+5' }, { quoted: msg });
    }

    const expression = args.join(' ');

    try {
        const response = await axios.get(`http://api.mathjs.org/v4/?expr=${encodeURIComponent(expression)}`);
        const result = response.data;

        await sock.sendMessage(chatId, {
            text: `🧮 *الآلة الحاسبة* 🧮\n\nالسؤال: ${expression}\nالنتيجة: *${result}*`
        }, { quoted: msg });

    } catch (error) {
        console.error('Calc Error:', error);
        await sock.sendMessage(chatId, { text: '❌ تعذر حساب العملية. تأكد من كتابتها بشكل صحيح.' }, { quoted: msg });
    }
}

module.exports = calcCommand;
