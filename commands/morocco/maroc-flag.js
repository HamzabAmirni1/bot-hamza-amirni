const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

module.exports = async (sock, chatId, msg) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ? { key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
        : msg;

    const hasImage = quoted?.message?.imageMessage
        || quoted?.message?.documentMessage?.mimetype?.startsWith('image/');

    if (!hasImage) {
        return sock.sendMessage(chatId, {
            text: '❌ رد على *صورة* بـ:\n.maroc-flag'
        }, { quoted: msg });
    }

    let tmpPath = null;
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        const buffer = await sock.downloadMediaMessage(quoted);
        const form = new FormData();
        form.append('fileToUpload', buffer, 'image.jpg');
        form.append('reqtype', 'fileupload');

        const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });
        const imageUrl = String(uploadRes.data || '').trim();
        if (!imageUrl.startsWith('https://')) throw new Error('Upload failed');

        const apiUrl = `https://mr-obito-api.vercel.app/api/tools/flag-morocco?url=${encodeURIComponent(imageUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 45000 });

        tmpPath = path.join(process.cwd(), 'tmp', `flag_${Date.now()}.png`);
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
        fs.writeFileSync(tmpPath, response.data);

        await sock.sendMessage(chatId, {
            image: fs.readFileSync(tmpPath),
            caption: '✅ تم إضافة علم المغرب 🇲🇦\n\n⚔️ Hamza Amirni Bot'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (err) {
        console.error('[maroc-flag]', err.message);
        await sock.sendMessage(chatId, { text: '❌ وقع خطأ. تأكد من الصورة وجرب مرة أخرى.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    } finally {
        if (tmpPath && fs.existsSync(tmpPath)) {
            try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        }
    }
};
