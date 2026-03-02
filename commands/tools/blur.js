const jimp = require('jimp');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../../settings');

/**
 * Blur Image using Jimp
 * ported from silana-lite-ofc
 */
async function blurCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        let quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
            message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
            key: {
                remoteJid: chatId,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant
            }
        } : msg;

        const isImage = !!(quoted.message?.imageMessage || (quoted.message?.documentMessage && quoted.message.documentMessage.mimetype?.includes('image')));
        const isViewOnce = !!(quoted.message?.viewOnceMessage?.message?.imageMessage || quoted.message?.viewOnceMessageV2?.message?.imageMessage);

        if (!isImage && !isViewOnce) {
            const helpMsg = userLang === 'ar' || userLang === 'ma'
                ? `❌ المرجو الرد على صورة بالامر *${settings.prefix}blur*`
                : `❌ Please reply to an image with *${settings.prefix}blur*`;
            return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
        }

        const level = parseInt(args[0]) || 5;

        await sock.sendMessage(chatId, { react: { text: "🌫️", key: msg.key } });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        const img = await jimp.read(buffer);
        img.blur(isNaN(level) ? 5 : level);
        const resultBuffer = await img.getBufferAsync(jimp.MIME_JPEG);

        const successMsg = userLang === 'ar' || userLang === 'ma'
            ? "✨ تم تعتيم الصورة بنجاح!"
            : "✨ Image blurred successfully!";

        await sock.sendMessage(chatId, {
            image: resultBuffer,
            caption: `✅ *${successMsg}*\n🌫️ Level: ${level}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Blur Error:', e);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        const errorMsg = userLang === 'ar' || userLang === 'ma'
            ? `❌ فشلت العملية:\n${e.message}`
            : `❌ Operation failed:\n${e.message}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = blurCommand;
