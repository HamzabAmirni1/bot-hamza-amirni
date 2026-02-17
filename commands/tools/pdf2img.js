/*
📄 تحويل ملف PDF إلى صور (محلياً)
By: حمزة اعمرني (Hamza Amirni)
*/

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { t } = require('../lib/language');
const settings = require('../settings');

// Check for local conversion library
let pdf2img;
try {
    pdf2img = require('pdf-img-convert');
} catch (e) {
    pdf2img = null;
}

async function handler(sock, chatId, msg, args, commands, userLang) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedDoc = quoted?.documentMessage;
    const isDirectDoc = msg.message?.documentMessage;

    // Check dependency first
    if (!pdf2img) {
        return await sock.sendMessage(chatId, {
            text: t('pdf2img.error_lib', {}, userLang)
        }, { quoted: msg });
    }

    if (!isQuotedDoc && !isDirectDoc) {
        return await sock.sendMessage(chatId, {
            text: t('pdf2img.help', { prefix: settings.prefix }, userLang)
        }, { quoted: msg });
    }

    const docMsg = isDirectDoc ? msg.message.documentMessage : quoted.documentMessage;
    if (docMsg.mimetype !== 'application/pdf') {
        return await sock.sendMessage(chatId, { text: t('pdf2img.not_pdf', {}, userLang) }, { quoted: msg });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });
        const waitMsg = await sock.sendMessage(chatId, { text: t('pdf2img.downloading', {}, userLang) }, { quoted: msg });

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
        if (!buffer) throw new Error("Could not download file.");

        // Convert Locally
        console.log('📄 Starting Local PDF Conversion...');

        // Convert to images (Returns array of Uint8Array or Buffers)
        const imageBuffers = await pdf2img.convert(buffer, {
            width: 1500, // Good resolution
            page_numbers: [] // All pages
        });

        if (!imageBuffers || imageBuffers.length === 0) {
            throw new Error("Failed to extract images from PDF.");
        }

        const total = imageBuffers.length;
        const fileName = docMsg.fileName || `file_${Date.now()}.pdf`;

        console.log(`✅ Converted ${total} pages.`);

        // Delete wait message
        try { await sock.sendMessage(chatId, { delete: waitMsg.key }); } catch (e) { }

        await sock.sendMessage(chatId, { text: t('pdf2img.success_pages', { total }, userLang) }, { quoted: msg });

        if (total > 30) {
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
                caption: t('pdf2img.zip_caption', { total }, userLang)
            }, { quoted: msg });

            // Send first 3 images as preview
            for (let i = 0; i < Math.min(total, 3); i++) {
                await sock.sendMessage(chatId, {
                    image: Buffer.from(imageBuffers[i]),
                    caption: t('pdf2img.page_caption', { current: i + 1, total }, userLang)
                });
            }

        } else {
            // Individual Mode
            for (let i = 0; i < total; i++) {
                await sock.sendMessage(chatId, {
                    image: Buffer.from(imageBuffers[i]),
                    caption: t('pdf2img.page_caption', { current: i + 1, total }, userLang)
                });
            }
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error('Local PDF2IMG Error:', err);
        await sock.sendMessage(chatId, { text: t('pdf2img.error', { error: err.message }, userLang) }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

module.exports = handler;
