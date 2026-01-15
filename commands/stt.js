const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const { uploadFile } = require('../lib/uploader');
const { t } = require('../lib/language');
const settings = require('../settings');

async function sttCommand(sock, chatId, message, args, commands, userLang) {
    try {
        // 1. Detection: Find the audio message (direct, quoted, or inside document)
        let targetMessage = null;

        // Direct audio
        if (message.message?.audioMessage) {
            targetMessage = message;
        }
        // Quoted audio
        else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage) {
            const quotedInfo = message.message.extendedTextMessage.contextInfo;
            targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                },
                message: quotedInfo.quotedMessage
            };
        }
        // Audio sent as document
        else if (message.message?.documentMessage && message.message.documentMessage.mimetype?.includes('audio')) {
            targetMessage = message;
        }
        else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.documentMessage?.mimetype?.includes('audio')) {
            const quotedInfo = message.message.extendedTextMessage.contextInfo;
            targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                },
                message: quotedInfo.quotedMessage
            };
        }

        if (!targetMessage) {
            return await sock.sendMessage(chatId, {
                text: t('stt.help', { prefix: settings.prefix }, userLang) || "🎙️ *تحويل الصوت إلى نص*\n\nيرجى الرد على رسالة صوتية بـ .stt"
            }, { quoted: message });
        }

        // 2. Start Processing
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
        const waitMsg = await sock.sendMessage(chatId, {
            text: t('stt.downloading', {}, userLang) || "⏳ جاري تحميل وفحص الصوت... يرجى الانتظار."
        }, { quoted: message });

        // 3. Download
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download audio buffer.");

        // 4. Upload to CDN
        const audioUrl = await uploadFile(buffer);
        if (!audioUrl || typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
            throw new Error("Failed to upload audio to a working CDN.");
        }

        console.log(`[STT] Audio uploaded to: ${audioUrl}`);

        // 5. Try Multiple APIs (Fallbacks)
        let transcribedText = "";
        const apis = [
            async () => {
                // GiftedTech
                const res = await axios.get(`https://api.giftedtech.my.id/api/ai/whisper?url=${encodeURIComponent(audioUrl)}`);
                return res.data?.success ? res.data.result : (res.data?.result || null);
            },
            async () => {
                // Vreden
                const res = await axios.get(`https://api.vreden.my.id/api/stt?url=${encodeURIComponent(audioUrl)}`);
                if (res.data?.status === 200) {
                    return typeof res.data.result === 'string' ? res.data.result : (res.data.result?.text || null);
                }
                return null;
            },
            async () => {
                // Agungnx (Very common)
                const res = await axios.get(`https://api.agungnx.my.id/api/whisper?url=${encodeURIComponent(audioUrl)}`);
                return res.data?.status ? res.data.result : null;
            }
        ];

        for (const apiCall of apis) {
            try {
                const result = await apiCall();
                if (result && typeof result === 'string' && result.trim().length > 0) {
                    transcribedText = result.trim();
                    break;
                }
            } catch (e) {
                console.error(`[STT] API Fallback Error:`, e.message);
            }
        }

        // 6. Respond
        if (!transcribedText) {
            throw new Error("All transcription APIs failed.");
        }

        // Delete waiting message
        try { await sock.sendMessage(chatId, { delete: waitMsg.key }); } catch (e) { }

        await sock.sendMessage(chatId, {
            text: t('stt.success', { text: transcribedText }, userLang) || `🎙️ *النص المستخرج:*\n\n${transcribedText}`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (err) {
        console.error("STT major error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, {
            text: t('stt.error', {}, userLang) || "❌ فشل تحويل الصوت إلى نص. حاول مرة أخرى."
        }, { quoted: message });
    }
}

module.exports = sttCommand;
