const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const { fromBuffer } = require('file-type');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Pixnova {
    constructor() {
        this.defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
            'dnt': '1',
            'origin': 'https://pixnova.ai',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://pixnova.ai/',
            'fp': '6f4144209c84f0b211fa163f2df3d6ac',
            'fp1': '9ql/F3xu50wofmBCP/OgFcl7LJ6tApNpgApnMs9MmvtrPpOsDolzCCleIXOXI2sS',
            'x-code': '1751088342820',
            'x-guide': 'pHu8//JrvLc1UVdobzPkh3C+5QQjlTO+sNEPGlVAQajV/mYTk3c1NvJh30YPG6S7jb0Dvs2t8oelHE+fYD42jHGVh/2Z7ILqvpW/tr2O1ueJ5erE8JGsCiDWr5QyOqfD9/1aHjYluadqZhBbQQb/Y2YdvJZ2VzPGo5wHbQOzCAc=',
        };
        this.imageBaseUrl = 'https://oss-global.pixnova.ai/';
    }

    async upload(buffer, fn_name = 'cloth-change') {
        const fileType = await fromBuffer(buffer);
        if (!fileType) throw new Error('Cannot determine image file type.');

        const form = new FormData();
        form.append('file', buffer, { filename: 'image.' + fileType.ext, contentType: fileType.mime });
        form.append('fn_name', fn_name);
        form.append('request_from', '2');

        const res = await axios.post('https://api.pixnova.ai/aitools/upload-img', form, {
            headers: { ...this.defaultHeaders, ...form.getHeaders() },
        });
        return res.data;
    }

    async clothCreate(sourceImagePath, prompt) {
        const payload = {
            fn_name: 'cloth-change',
            call_type: 3,
            input: {
                source_image: sourceImagePath,
                prompt,
                request_from: 2,
                type: 1,
            },
            request_from: 2,
        };
        const res = await axios.post('https://api.pixnova.ai/aitools/of/create', payload, {
            headers: { ...this.defaultHeaders, 'Content-Type': 'application/json' },
        });
        return res.data;
    }

    async checkStatus(taskId) {
        const payload = {
            task_id: taskId,
            fn_name: 'cloth-change',
            call_type: 3,
            request_from: 2,
            origin_from: '111977c0d5def647',
        };
        const res = await axios.post('https://api.pixnova.ai/aitools/of/check-status', payload, {
            headers: { ...this.defaultHeaders, 'Content-Type': 'application/json' },
        });
        return res.data;
    }

    async run(imageInput, prompt) {
        const uploaded = await this.upload(imageInput);
        const imagePath = uploaded.data?.path;
        if (!imagePath) throw new Error('Upload failed or no path returned.');

        const create = await this.clothCreate(imagePath, prompt);
        const taskId = create.data?.task_id;
        if (!taskId) throw new Error('Task creation failed or task_id missing.');

        let retries = 25;
        while (retries-- > 0) {
            const status = await this.checkStatus(taskId);
            const s = status.data?.status;
            if (s === 2) return this.imageBaseUrl + status.data.result_image;
            if (s === -1) throw new Error('Task failed on server.');
            await sleep(7000);
        }
        throw new Error('Timeout: No result after multiple retries.');
    }
}

async function clothChangeCommand(sock, chatId, msg, args, commands, userLang) {
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

        const prompt = args.join(' ');

        if (!isImage && !isViewOnce) {
            const helpMsg = userLang === 'ar' || userLang === 'ma'
                ? `❌ المرجو الرد على صورة بالامر *${settings.prefix}cloth-change* مع وصف للملابس.\nمثال: \`${settings.prefix}cloth-change red dress\``
                : `❌ Please reply to an image with *${settings.prefix}cloth-change* and a description.\nExample: \`${settings.prefix}cloth-change elegant suit\``;
            return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
        }

        if (!prompt) {
            const promptMsg = userLang === 'ar' || userLang === 'ma'
                ? `✍️ المرجو إدخال وصف للملابس التي تريد تجربتها.\nمثال: \`${settings.prefix}cloth-change blue t-shirt\``
                : "✍️ Please provide a description of the clothes you want to try.\nExample: `.cloth-change blue t-shirt`";
            return await sock.sendMessage(chatId, { text: promptMsg }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "👔", key: msg.key } });

        const waitMsg = userLang === 'ar' || userLang === 'ma'
            ? "🔄 جاري تبديل الملابس بمساعدة الذكاء الاصطناعي، المرجو الانتظار قليلاً..."
            : "🔄 Changing clothes with AI, please wait a moment...";
        await sock.sendMessage(chatId, { text: waitMsg }, { quoted: msg });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        const pixnova = new Pixnova();
        const resultUrl = await pixnova.run(buffer, prompt);

        const successMsg = userLang === 'ar' || userLang === 'ma'
            ? "✨ تم تبديل الملابس بنجاح!"
            : "✨ Clothes changed successfully!";

        await sock.sendMessage(chatId, {
            image: { url: resultUrl },
            caption: `✅ *${successMsg}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Cloth Change Error:', e);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        const errorMsg = userLang === 'ar' || userLang === 'ma'
            ? `❌ فشلت العملية:\n${e.message}`
            : `❌ Operation failed:\n${e.message}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = clothChangeCommand;
