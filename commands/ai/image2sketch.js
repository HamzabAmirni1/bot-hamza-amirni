const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const { uploadImage } = require('../../lib/uploader');
const crypto = require('crypto');
const https = require('https');

// Generate a random session hash
function generateSessionHash() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 11; i++) {
        const byte = crypto.randomBytes(1)[0];
        result += chars[byte % chars.length];
    }
    return result;
}

// Read and parse the stream for the final image result
function getStream(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let buffer = '';
            res.on('data', chunk => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            if (data.msg === 'process_completed' && data.output?.data?.[0]?.url) {
                                resolve(data.output.data[0].url);
                            }
                        } catch (e) { }
                    }
                }
            });
            res.on('end', () => reject('Stream ended without completion'));
        }).on('error', reject);
    });
}

// Convert the uploaded image into a sketch using the HuggingFace API
async function imageToSketch(imageBuffer) {
    const sessionHash = generateSessionHash();

    const form = new (require('form-data'))();
    form.append('files', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
    });

    const uploadRes = await axios.post(
        'https://raec25-image-to-drawing-sketch.hf.space/gradio_api/upload?upload_id=qcu1l42hpn',
        form,
        { headers: form.getHeaders() }
    );

    const filePath = uploadRes.data[0];

    const payload = {
        data: [
            {
                path: filePath,
                url: `https://raec25-image-to-drawing-sketch.hf.space/gradio_api/file=${filePath}`,
                orig_name: 'image.jpg',
                size: imageBuffer.length,
                mime_type: 'image/jpeg',
                meta: { _type: 'gradio.FileData' }
            },
            "Pencil Sketch"
        ],
        event_data: null,
        fn_index: 2,
        trigger_id: 13,
        session_hash: sessionHash
    };

    await axios.post(
        'https://raec25-image-to-drawing-sketch.hf.space/gradio_api/queue/join?__theme=system',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    return await getStream(`https://raec25-image-to-drawing-sketch.hf.space/gradio_api/queue/data?session_hash=${sessionHash}`);
}

async function sketchCommand(sock, chatId, msg, args, commands, userLang) {
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
                ? `❌ المرجو الرد على صورة بالامر *${settings.prefix}image2sketch*`
                : `❌ Please reply to an image with *${settings.prefix}image2sketch*`;
            return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "✏️", key: msg.key } });

        const waitMsg = userLang === 'ar' || userLang === 'ma'
            ? "🔄 جاري تحويل الصورة إلى رسم بالقلم الرصاص، المرجو الانتظار..."
            : "🔄 Converting image to pencil sketch, please wait...";
        await sock.sendMessage(chatId, { text: waitMsg }, { quoted: msg });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        const resultUrl = await imageToSketch(buffer);

        const successMsg = userLang === 'ar' || userLang === 'ma'
            ? "✨ تم تحويل الصورة بنجاح!"
            : "✨ Image converted to sketch successfully!";

        await sock.sendMessage(chatId, {
            image: { url: resultUrl },
            caption: `✅ *${successMsg}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Sketch Error:', e);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        const errorMsg = userLang === 'ar' || userLang === 'ma'
            ? `❌ فشلت العملية:\n${e.message}`
            : `❌ Operation failed:\n${e.message}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = sketchCommand;
