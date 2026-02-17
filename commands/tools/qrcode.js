const settings = require('../settings');

async function qrcodeCommand(sock, chatId, msg, args) {
    if (!args.length) {
        return await sock.sendMessage(chatId, { text: '❌ الرجاء كتابة النص لتحويله إلى كود QR، مثال: .qr Hello' }, { quoted: msg });
    }

    const text = args.join(' ');
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

    try {
        await sock.sendMessage(chatId, {
            image: { url: url },
            caption: `✅ تم إنشاء كود QR للنص: "${text}"`,
            footer: settings.botName
        }, { quoted: msg });
    } catch (error) {
        console.error('QR Code Error:', error);
        await sock.sendMessage(chatId, { text: '❌ تعذر إنشاء كود QR.' }, { quoted: msg });
    }
}

module.exports = qrcodeCommand;
