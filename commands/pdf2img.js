/*
📄 تحويل ملف PDF إلى صور (محلياً)
By: حمزة اعمرني (Hamza Amirni)
*/

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Check for local conversion library
let pdf2img;
try {
    pdf2img = require('pdf-img-convert');
} catch (e) {
    pdf2img = null;
}

async function handler(sock, chatId, msg, args) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedDoc = quoted?.documentMessage;
    const isDirectDoc = msg.message?.documentMessage;

    // Check dependency first
    if (!pdf2img) {
        return await sock.sendMessage(chatId, {
            text: '❌ *مكتبة التحويل المحلي غير مثبتة!*\n\n⚠️ المرجو من صاحب البوت كتابة هذا الأمر في التيرمينال:\n`npm install pdf-img-convert`\n\nثم أعد تشغيل البوت.'
        }, { quoted: msg });
    }

    if (!isQuotedDoc && !isDirectDoc) {
        return await sock.sendMessage(chatId, {
            text: '*✨ ──────────────── ✨*\n📄 *تحويل PDF إلى صور (محلي)* 📄\n\n📌 *يرجى الرد على ملف PDF بـ:*\n.pdf2img\n*✨ ──────────────── ✨*'
        }, { quoted: msg });
    }

    const docMsg = isDirectDoc ? msg.message.documentMessage : quoted.documentMessage;
    if (docMsg.mimetype !== 'application/pdf') {
        return await sock.sendMessage(chatId, { text: '❌ يرجى اختيار ملف بصيغة PDF فقط.' }, { quoted: msg });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });
        const waitMsg = await sock.sendMessage(chatId, { text: "🔄 جاري تحميل الملف وتحويله محلياً... (قد يستغرق وقتاً)" }, { quoted: msg });

        const targetMsg = isQuotedDoc ? {
            key: {
                remoteJid: chatId,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant
            },
            message: quoted
        } : msg;

        // Download Buffer
        const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });
        if (!buffer) throw new Error("فشل تحميل الملف.");

        // Convert Locally
        console.log('📄 Starting Local PDF Conversion...');

        // Convert to images (Returns array of Uint8Array or Buffers)
        const imageBuffers = await pdf2img.convert(buffer, {
            width: 1200, // Good resolution
            height: 1200,
            page_numbers: [] // All pages
        });

        if (!imageBuffers || imageBuffers.length === 0) {
            throw new Error("فشل استخراج الصور من الملف.");
        }

        const total = imageBuffers.length;
        const fileName = docMsg.fileName || `file_${Date.now()}.pdf`;

        console.log(`✅ Converted ${total} pages.`);

        // Delete wait message
        try { await sock.sendMessage(chatId, { delete: waitMsg.key }); } catch (e) { }

        await sock.sendMessage(chatId, { text: `✅ تم تحويل ${total} صفحة بنجاح. جاري الإرسال...` }, { quoted: msg });

        if (total > 10) {
            // ZIP Mode
            const zip = new AdmZip();
            imageBuffers.forEach((imgBuf, i) => {
                zip.addFile(`page_${i + 1}.png`, Buffer.from(imgBuf));
            });
            const zipBuffer = zip.toBuffer();

            await sock.sendMessage(chatId, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: `${fileName.replace('.pdf', '')}_images.zip`,
                caption: `📄 *تحويل محلي ناجح*\n📦 عدد الصفحات: ${total}\n✅ تم الضغط في ملف ZIP.`
            }, { quoted: msg });

        } else {
            // Individual Mode
            for (let i = 0; i < total; i++) {
                await sock.sendMessage(chatId, {
                    image: Buffer.from(imageBuffers[i]),
                    caption: `📄 *الصفحة ${i + 1} من ${total}*`
                });
            }
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error('Local PDF2IMG Error:', err);
        await sock.sendMessage(chatId, { text: `❌ *خطأ في التحويل المحلي:*\n${err.message}` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

module.exports = handler;
