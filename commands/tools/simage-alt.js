var { downloadContentFromMessage } = require('@whiskeysockets/baileys');
var { exec } = require('child_process');
var fs = require('fs');
var path = require('path');

let ffmpeg;
try {
    ffmpeg = require('ffmpeg-static');
} catch (e) {
    ffmpeg = null;
}

const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

async function simageCommand(sock, quotedMessage, chatId) {
    try {
        if (!ffmpeg) {
            await sock.sendMessage(chatId, { text: 'The simage-alt command is temporarily disabled (missing ffmpeg-static on the server).' });
            return;
        }

        if (!quotedMessage?.stickerMessage) {
            await sock.sendMessage(chatId, { text: 'Please reply to a sticker!' });
            return;
        }

        const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const tempSticker = path.join(tempDir, `temp_${Date.now()}.webp`);
        const tempOutput = path.join(tempDir, `image_${Date.now()}.png`);
        
        fs.writeFileSync(tempSticker, buffer);

        // Convert webp to png using ffmpeg
        await new Promise((resolve, reject) => {
            exec(`${ffmpeg} -i ${tempSticker} ${tempOutput}`, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        await sock.sendMessage(chatId, { 
            image: fs.readFileSync(tempOutput),
            caption: '✨ Here\'s your image!' 
        });

        // Cleanup
        fs.unlinkSync(tempSticker);
        fs.unlinkSync(tempOutput);

    } catch (error) {
        console.error('Error in simage command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to convert sticker to image!' });
    }
}

module.exports = simageCommand; 
