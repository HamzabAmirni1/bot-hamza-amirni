const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

async function ocrCommand(sock, chatId, message, args) {
    // Determine the target message (direct or quoted)
    let targetMessage = message;
    let isImage = message.message?.imageMessage;

    if (!isImage && message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: { remoteJid: chatId, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
            message: quotedInfo.quotedMessage
        };
        isImage = true;
    }

    if (!isImage) {
        return await sock.sendMessage(chatId, {
            text: `❌ يرجى الرد على صورة بـ *${settings.prefix}ocr* لاستخراج النص منها.`
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "🔍", key: message.key } });

        // Download image buffer
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        // Create temp file
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempPath = path.join(tmpDir, `ocr_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, buffer);

        // Prepare form data for OCR.space
        const form = new FormData();
        form.append('apikey', 'K81241004488957');
        form.append('file', fs.createReadStream(tempPath));

        // Default to Arabic if first arg is 'ar', otherwise English or auto
        let lang = 'eng';
        if (args[0] === 'ar' || args[0] === 'ara' || args[0] === 'عربي') lang = 'ara';
        form.append('language', lang);
        form.append('isOverlayRequired', 'false');

        const response = await axios.post('https://api.ocr.space/parse/image', form, {
            headers: form.getHeaders(),
        });

        // Cleanup
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        if (response.data.OCRExitCode === 1) {
            const textResult = response.data.ParsedResults[0]?.ParsedText || '❌ لم يتم اكتشاف نص في الصورة.';
            await sock.sendMessage(chatId, {
                text: `📝 *نتائج استخراج النص (OCR):*\n\n${textResult}`
            }, { quoted: message });
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        } else {
            throw new Error(response.data.ErrorMessage || 'Failed to perform OCR.');
        }

    } catch (err) {
        console.error("OCR error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, {
            text: `❌ حدث خطأ أثناء معالجة الصورة:\n${err.message || err}`
        }, { quoted: message });
    }
}

module.exports = ocrCommand;
