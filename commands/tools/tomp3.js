const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const settings = require('../settings');

async function tomp3Command(sock, chatId, message) {
    // Determine the target message (direct or quoted)
    let targetMessage = message;
    let isVideo = message.message?.videoMessage;

    if (!isVideo && message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: { remoteJid: chatId, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
            message: quotedInfo.quotedMessage
        };
        isVideo = true;
    }

    if (!isVideo) {
        return await sock.sendMessage(chatId, { text: "❌ يرجى الرد على فيديو بـ *.tomp3* لتحويله إلى صوت." }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // Download video buffer
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download video.");

        // Create temp folder
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tempInput = path.join(tmpDir, `video_${Date.now()}.mp4`);
        const tempOutput = path.join(tmpDir, `audio_${Date.now()}.mp3`);

        fs.writeFileSync(tempInput, buffer);

        // Convert using ffmpeg
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${tempInput}" -vn -ar 44100 -ac 2 -b:a 192k "${tempOutput}"`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Send audio
        await sock.sendMessage(chatId, {
            audio: { url: tempOutput },
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `audio_${Date.now()}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

        // Cleanup
        [tempInput, tempOutput].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

    } catch (err) {
        console.error("tomp3 error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, { text: "❌ فشل تحويل الفيديو إلى صوت. تأكد من أن الفيديو ليس كبيراً جداً." }, { quoted: message });
    }
}

module.exports = tomp3Command;
