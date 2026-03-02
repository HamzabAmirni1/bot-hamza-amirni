const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const { t } = require('../../lib/language');

/**
 * Upscale Image using Pixelcut API
 * ported from silana-lite-ofc
 */
async function upscaleCommand(sock, chatId, msg, args, commands, userLang) {
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
                ? `❌ المرجو الرد على صورة بالامر *${settings.prefix}upscale-hd*`
                : `❌ Please reply to an image with *${settings.prefix}upscale-hd*`;
            return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

        const waitMsg = userLang === 'ar' || userLang === 'ma'
            ? "🔄 جاري تحسين جودة الصورة، المرجو الانتظار..."
            : "🔄 Enhancing image quality, please wait...";
        await sock.sendMessage(chatId, { text: waitMsg }, { quoted: msg });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        const form = new FormData();
        form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        form.append('scale', '2');

        const headers = {
            ...form.getHeaders(),
            'accept': 'application/json',
            'x-client-version': 'web',
            'x-locale': 'en'
        };

        const res = await axios.post('https://api2.pixelcut.app/image/upscale/v1', form, { headers });
        const json = res.data;

        if (!json?.result_url) throw new Error('Failed to get result from API.');

        const resultResponse = await axios.get(json.result_url, { responseType: 'arraybuffer' });
        const resultBuffer = Buffer.from(resultResponse.data);

        const successMsg = userLang === 'ar' || userLang === 'ma'
            ? "✨ تم تحسين جودة الصورة بنجاح (2x)!"
            : "✨ Image upscaled successfully (2x)!";

        await sock.sendMessage(chatId, {
            image: resultBuffer,
            caption: `✅ *${successMsg}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Upscale Error:', e);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        const errorMsg = userLang === 'ar' || userLang === 'ma'
            ? `❌ فشل التحسين:\n${e.message}`
            : `❌ Upscale failed:\n${e.message}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = upscaleCommand;
