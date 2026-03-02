const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const tempDir = './temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const scheduleFileDeletion = (filePath) => {
    setTimeout(async () => {
        try {
            if (fs.existsSync(filePath)) {
                await fsPromises.unlink(filePath);
            }
        } catch (error) {
            console.error(`Failed to delete file:`, error);
        }
    }, 30000); // 30 seconds cleanup
};

const convertStickerToImage = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMessage = msg.message?.stickerMessage || quoted?.stickerMessage;

        if (!stickerMessage) {
            await sock.sendMessage(chatId, { text: '⚠️ يرجى الرد على ملصق (sticker) بهذا الأمر لتحويله إلى صورة.' }, { quoted: msg });
            return;
        }

        const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);
        const outputImagePath = path.join(tempDir, `converted_image_${Date.now()}.png`);

        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await fsPromises.writeFile(stickerFilePath, buffer);
        await sharp(stickerFilePath).toFormat('png').toFile(outputImagePath);

        await sock.sendMessage(chatId, {
            image: { url: outputImagePath },
            caption: '✅ تم تحويل الملصق إلى صورة بنجاح!'
        }, { quoted: msg });

        scheduleFileDeletion(stickerFilePath);
        scheduleFileDeletion(outputImagePath);
    } catch (error) {
        console.error('Error converting sticker to image:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء تحويل الملصق.' }, { quoted: msg });
    }
};

module.exports = convertStickerToImage;
