/*
📄 تحويل ملف PDF إلى صور (الكل)
By: حمزة اعمرني (Hamza Amirni)
*/

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// رفع الملف إلى Catbox (Using Axios for stability)
const uploadToCatbox = async (buffer, filename) => {
    const form = new FormData();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.]/g, '_');
    form.append('fileToUpload', buffer, { filename: cleanFilename });
    form.append('reqtype', 'fileupload');

    try {
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        if (response.data && response.data.startsWith('https://')) return response.data;
        throw new Error('Catbox Upload Failed: ' + response.data);
    } catch (error) {
        throw new Error(`Upload Error: ${error.message}`);
    }
};

async function handler(sock, chatId, msg, args) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedDoc = quoted?.documentMessage;
    const isDirectDoc = msg.message?.documentMessage;

    if (!isQuotedDoc && !isDirectDoc) {
        return await sock.sendMessage(chatId, {
            text: '*✨ ──────────────── ✨*\n📄 *تحويل PDF إلى صور (جميع الصفحات)* 📄\n\n📌 *يرجى الرد على ملف PDF بـ:*\n.pdf2img\n*✨ ──────────────── ✨*'
        }, { quoted: msg });
    }

    const docMsg = isDirectDoc ? msg.message.documentMessage : quoted.documentMessage;
    if (docMsg.mimetype !== 'application/pdf') {
        return await sock.sendMessage(chatId, { text: '❌ يرجى اختيار ملف بصيغة PDF فقط.' }, { quoted: msg });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

        const targetMsg = isQuotedDoc ? {
            key: {
                remoteJid: chatId,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant
            },
            message: quoted
        } : msg;

        const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });
        if (!buffer) throw new Error("فشل تحميل الملف.");

        const fileName = docMsg.fileName || `file_${Date.now()}.pdf`;
        const waitMsg = await sock.sendMessage(chatId, { text: "🔄 جاري رفع الملف ومعالجته... يرجى الانتظار." }, { quoted: msg });

        // 1. Upload to Catbox
        const pdfUrl = await uploadToCatbox(buffer, fileName);
        console.log('PDF Uploaded:', pdfUrl);

        // 2. Try Multiple APIs
        const apis = [
            `https://bk9.fun/tools/pdf2img?url=${encodeURIComponent(pdfUrl)}`,
            `https://api.agatz.xyz/api/pdf2img?url=${encodeURIComponent(pdfUrl)}`,
            `https://api.vreden.my.id/api/pdftoimg?url=${encodeURIComponent(pdfUrl)}`,
            `https://www.dark-yasiya-api.site/other/pdf2img?url=${encodeURIComponent(pdfUrl)}`
        ];

        let images = [];
        let success = false;

        for (let apiUrl of apis) {
            try {
                console.log('Trying API:', apiUrl);
                const res = await axios.get(apiUrl, { timeout: 60000 });
                const data = res.data;

                // Handle different API response structures
                if (data.status === true && data.BK9) {
                    images = data.BK9; // BK9 structure
                } else if (data.status === 200 && data.data) {
                    images = data.data; // Agatz structure
                } else if (data.result) {
                    images = data.result; // Vreden/Generic
                } else if (Array.isArray(data)) {
                    images = data;
                }

                if (images && images.length > 0) {
                    success = true;
                    console.log(`Success with API: ${apiUrl}`);
                    break;
                }
            } catch (e) {
                console.error(`API failed: ${apiUrl} - ${e.message}`);
            }
        }

        try { await sock.sendMessage(chatId, { delete: waitMsg.key }); } catch (e) { }

        if (success && images.length > 0) {
            const total = images.length;
            await sock.sendMessage(chatId, { text: `✅ تم استخراج ${total} صورة بنجاح. جاري الإرسال...` }, { quoted: msg });

            if (total > 10) {
                // Return as ZIP if too many pages
                const zip = new AdmZip();
                for (let i = 0; i < total; i++) {
                    const imgUrl = typeof images[i] === 'string' ? images[i] : (images[i].url || images[i].result);
                    try {
                        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                        zip.addFile(`page_${i + 1}.png`, Buffer.from(imgRes.data));
                    } catch (e) { }
                }
                const zipBuffer = zip.toBuffer();
                await sock.sendMessage(chatId, {
                    document: zipBuffer,
                    mimetype: 'application/zip',
                    fileName: `${fileName.replace('.pdf', '')}_images.zip`,
                    caption: `📄 تم تحويل ${total} صفحة.\nتم ضغطها في ملف ZIP لسهولة التحميل.`
                }, { quoted: msg });
            } else {
                // Send individually
                for (let i = 0; i < total; i++) {
                    const imgUrl = typeof images[i] === 'string' ? images[i] : (images[i].url || images[i].result);
                    await sock.sendMessage(chatId, {
                        image: { url: imgUrl },
                        caption: `📄 *الصفحة ${i + 1} من ${total}*`
                    });
                }
            }
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        } else {
            throw new Error("فشلت جميع محاولات التحويل عبر السيرفرات.");
        }

    } catch (err) {
        console.error('PDF to Img Error:', err);
        await sock.sendMessage(chatId, { text: `❌ *خطأ:* ${err.message}` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

module.exports = handler;
