const { sendWithChannelButton } = require('../../lib/channelButton');
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { t } = require('../../lib/language');
const PDFDocument = require('pdfkit');

// Session Store
const pdfSessions = new Map();

async function pdfCommand(sock, chatId, message, args, commands, userLang) {
    const text = args.join(' ').trim().toLowerCase();
    const senderId = message.key.participant || message.key.remoteJid;

    // --- SESSION MANAGEMENT ---

    // Start Session
    if (text === 'start') {
        pdfSessions.set(senderId, {
            images: [],
            chatId: chatId, // To ensure we reply in correct chat
            startTime: Date.now()
        });
        const startMsg = userLang === 'ma'
            ? "📂 *بدينــا ضوسـي جديد!* 📂\n\nدابا صيفط التصاور وحدة بوحدة (أو بزاف دقة وحدة).\nملي تسالي، كتب *.pdf done* باش نجمعهم ليك فملف واحد.\n\n❌ للإلغاء: *.pdf cancel*"
            : "📂 *PDF Session Started!* 📂\n\nSend images now. When finished, type *.pdf done*.\n❌ To cancel: *.pdf cancel*";
        await sock.sendMessage(chatId, { text: startMsg }, { quoted: message });
        return;
    }

    // Finish Session
    if (text === 'done' || text === 'stop' || text === 'finish') {
        const session = pdfSessions.get(senderId);
        if (!session) {
            return await sock.sendMessage(chatId, { text: userLang === 'ma' ? "⚠️ مابديتي حتى ضوسي! دير .pdf start" : "⚠️ No active session! Use .pdf start" }, { quoted: message });
        }

        if (session.images.length === 0) {
            pdfSessions.delete(senderId);
            return await sock.sendMessage(chatId, { text: userLang === 'ma' ? "⚠️ ماصيفطتي والو! تلغى الضوسي." : "⚠️ No images sent. Session cancelled." }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
        await sock.sendMessage(chatId, { text: userLang === 'ma' ? `⏳ كنجمع ${session.images.length} تصويرة فملف PDF...` : `⏳ Merging ${session.images.length} images into PDF...` }, { quoted: message });

        try {
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFile = path.join(tempDir, `multi_${Date.now()}.pdf`);

            const doc = new PDFDocument({ autoFirstPage: false });
            const stream = fs.createWriteStream(tempFile);
            doc.pipe(stream);

            for (const imgBuffer of session.images) {
                try {
                    const img = doc.openImage(imgBuffer);
                    doc.addPage({ size: [img.width, img.height] });
                    doc.image(img, 0, 0);
                } catch (err) {
                    console.error("Error adding image page:", err);
                }
            }

            doc.end();

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: `Images_${Date.now()}.pdf`,
                mimetype: "application/pdf",
                caption: t('pdf.success_image', { botName: settings.botName }, userLang) || "✅ PDF Created Successfully!"
            }, { quoted: message });

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            pdfSessions.delete(senderId);
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

        } catch (e) {
            console.error('Merge PDF Error:', e);
            await sock.sendMessage(chatId, { text: "❌ Error merging PDF." }, { quoted: message });
            pdfSessions.delete(senderId);
        }
        return;
    }

    // Cancel Session
    if (text === 'cancel') {
        if (pdfSessions.has(senderId)) {
            pdfSessions.delete(senderId);
            await sock.sendMessage(chatId, { text: "✅ Session cancelled/deleted." }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: "⚠️ No active session." }, { quoted: message });
        }
        return;
    }


    // --- NORMAL SINGLE FILE LOGIC ---

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedImage = quoted?.imageMessage;
    const isDirectImage = message.message?.imageMessage;
    const isQuotedDoc = quoted?.documentMessage;
    const isDirectDoc = message.message?.documentMessage;

    // 0. Handle Office Documents (DOC, DOCX, PPT, PPTX, XLS)
    if (isDirectDoc || isQuotedDoc) {
        const docMsg = isDirectDoc ? message.message.documentMessage : quoted.documentMessage;
        const mime = docMsg.mimetype;
        const validMimes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/msword', // doc
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
            'application/vnd.ms-powerpoint', // ppt
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel' // xls
        ];

        if (validMimes.includes(mime)) {
            try {
                await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
                await sock.sendMessage(chatId, { text: t('pdf.converting_doc', {}, userLang) || "⏳ Converting document to PDF..." }, { quoted: message });

                const targetMsg = isQuotedDoc ? { message: quoted } : message;
                if (isQuotedDoc) {
                    targetMsg.key = {
                        remoteJid: chatId,
                        id: message.message?.extendedTextMessage?.contextInfo?.stanzaId,
                        participant: message.message?.extendedTextMessage?.contextInfo?.participant
                    };
                }

                const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });

                // Local Conversion with LibreOffice
                const tempDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                // Determine extension based on mime
                let ext = 'doc';
                if (mime.includes('wordprocessingml')) ext = 'docx';
                else if (mime.includes('spreadsheetml')) ext = 'xlsx';
                else if (mime.includes('excel')) ext = 'xls';
                else if (mime.includes('presentationml')) ext = 'pptx';
                else if (mime.includes('powerpoint')) ext = 'ppt';

                const inputFilename = `input_${Date.now()}.${ext}`;
                const inputFile = path.join(tempDir, inputFilename);
                fs.writeFileSync(inputFile, buffer);

                // LibreOffice Command
                const { exec } = require('child_process');
                // --outdir must be the directory, and result will have same name but .pdf
                const cmd = `libreoffice --headless --convert-to pdf --outdir "${tempDir}" "${inputFile}"`;

                await new Promise((resolve, reject) => {
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error('LibreOffice Error:', stderr);
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });

                const outputFilename = inputFilename.replace(`.${ext}`, '.pdf');
                const outputFile = path.join(tempDir, outputFilename);

                if (fs.existsSync(outputFile)) {
                    await sock.sendMessage(chatId, {
                        document: { url: outputFile },
                        fileName: "converted_document.pdf",
                        mimetype: "application/pdf",
                        caption: "✅ Converted Successfully!"
                    }, { quoted: message });

                    fs.unlinkSync(inputFile);
                    fs.unlinkSync(outputFile);
                    await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
                } else {
                    throw new Error("Output file not found after conversion");
                }
                return;

            } catch (e) {
                console.error('Doc to PDF Error:', e);
                const errMsg = userLang === 'ma' ? "❌ *فشل التحويل. تأكد من الملف (Local Conversion).* " : "❌ *Conversion failed.*";
                await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
                return;
            }
        }
    }

    // 1. Handle Photo to PDF (Local Conversion)
    if (isDirectImage || isQuotedImage) {
        try {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
            await sock.sendMessage(chatId, { text: t('pdf.converting_image', {}, userLang) || "⏳ Converting image to PDF..." }, { quoted: message });

            const targetMsg = isQuotedImage ? { message: quoted } : message;
            // Fake context for downloadMediaMessage if quoted
            if (isQuotedImage) {
                targetMsg.key = {
                    remoteJid: chatId,
                    id: message.message?.extendedTextMessage?.contextInfo?.stanzaId,
                    participant: message.message?.extendedTextMessage?.contextInfo?.participant
                };
            }

            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });

            if (!buffer) throw new Error("Failed to download image");

            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFile = path.join(tempDir, `image_${Date.now()}.pdf`);

            // Create PDF locally
            const doc = new PDFDocument({ autoFirstPage: false });
            const stream = fs.createWriteStream(tempFile);
            doc.pipe(stream);

            const img = doc.openImage(buffer);
            doc.addPage({ size: [img.width, img.height] });
            doc.image(img, 0, 0);
            doc.end();

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: "image_converted.pdf",
                mimetype: "application/pdf",
                caption: t('pdf.success_image', { botName: settings.botName }, userLang) || "✅ PDF Created Successfully!"
            }, { quoted: message });

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
            return;

        } catch (e) {
            console.error('Photo to PDF Error:', e);
            const errMsg = userLang === 'ma' ? "❌ *وقع مشكل ف تحويل التصويرة.*" : "❌ *Error converting image.*";
            await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
            return;
        }
    }

    // 2. Handle Text to PDF
    const content = text || quoted?.conversation || quoted?.extendedTextMessage?.text;

    if (content && text !== 'start' && text !== 'done') {
        try {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFile = path.join(tempDir, `text_${Date.now()}.pdf`);

            const doc = new PDFDocument();
            const stream = fs.createWriteStream(tempFile);
            doc.pipe(stream);

            // Simple text wrapping
            doc.fontSize(12).text(content, 100, 100);
            doc.end();

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: "text_converted.pdf",
                mimetype: "application/pdf",
                caption: t('pdf.success_text', { botName: settings.botName }, userLang) || "✅ PDF Created Successfully!"
            }, { quoted: message });

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
            return;

        } catch (e) {
            console.error('Text to PDF Error:', e);
            const errMsg = userLang === 'ma' ? "❌ *وقع مشكل ف تحويل النص.*" : "❌ *Error converting text.*";
            await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
            return;
        }
    }

    // 3. Show Usage Help
    const helpMsg = userLang === 'ma'
        ? `📄 *تحويل إلى PDF* 📄\n\n🔹 *الاستخدام:*\n1. صيفط تصويرة واكتب معاها ${settings.prefix}pdf\n2. كتب ${settings.prefix}pdf start باش تجمع بزاف د التصاور.\n3. أو كتب نص: ${settings.prefix}pdf [النص]\n\n⚔️ ${settings.botName}`
        : `📄 *PDF Converter* 📄\n\n🔹 *Usage:*\n1. Send/Reply Image with ${settings.prefix}pdf\n2. ${settings.prefix}pdf start (Multiple Images)\n3. ${settings.prefix}pdf [text]`;

    return await sendWithChannelButton(sock, chatId, helpMsg, message);
}

// Handler for collecting images
pdfCommand.handleSession = async (sock, msg, senderId) => {
    if (pdfSessions.has(senderId)) {
        const session = pdfSessions.get(senderId);

        // Check for Image
        const isImage = msg.message?.imageMessage;

        if (isImage) {
            console.log(`[PDF Session] Collecting image from ${senderId}`);
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });
                if (buffer) {
                    session.images.push(buffer);
                    // Acknowledge receipt silently or with reaction
                    await sock.sendMessage(msg.key.remoteJid, { react: { text: "📥", key: msg.key } });
                }
            } catch (e) {
                console.error("Failed to download session image", e);
            }
            return true; // Stop other handlers? No, but we handled it.
        }
    }
    return false;
};

module.exports = pdfCommand;
