const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const { uploadFile } = require('../lib/uploader');
const { t } = require('../lib/language');
const settings = require('../settings');

async function sttCommand(sock, chatId, message, args, commands, userLang) {
    // Determine the target message (direct or quoted audio)
    let targetMessage = message;
    let isAudio = message.message?.audioMessage;

    const quotedContent = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!isAudio && quotedContent?.audioMessage) {
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },
            message: quotedContent
        };
        isAudio = true;
    }

    if (!isAudio) {
        return await sock.sendMessage(chatId, {
            text: t('stt.help', { prefix: settings.prefix }, userLang)
        }, { quoted: message });
    }

    try {
        // Send reaction and waiting message
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
        const waitMsg = await sock.sendMessage(chatId, {
            text: t('stt.downloading', {}, userLang)
        }, { quoted: message });

        // Download audio buffer
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download audio.");

        // Upload audio to get a public URL
        const audioUrl = await uploadFile(buffer);
        if (!audioUrl) throw new Error("Failed to upload audio to CDN.");

        // Call STT API (Whisper)
        // Using a reliable free API for Whisper
        const apiUrl = `https://api.giftedtech.my.id/api/ai/whisper?url=${encodeURIComponent(audioUrl)}`;
        const response = await axios.get(apiUrl);

        // Delete waiting message
        try { await sock.sendMessage(chatId, { delete: waitMsg.key }); } catch (e) { }

        if (response.data && response.data.success && response.data.result) {
            const transcribedText = response.data.result;

            await sock.sendMessage(chatId, {
                text: t('stt.success', { text: transcribedText }, userLang)
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        } else {
            // Backup API if first one fails
            const backupUrl = `https://api.vreden.my.id/api/stt?url=${encodeURIComponent(audioUrl)}`;
            const backupRes = await axios.get(backupUrl);

            if (backupRes.data && backupRes.data.status === 200 && backupRes.data.result?.text) {
                const transcribedText = backupRes.data.result.text;
                await sock.sendMessage(chatId, {
                    text: t('stt.success', { text: transcribedText }, userLang)
                }, { quoted: message });
                await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
            } else {
                throw new Error("STT APIs failed to transcribe.");
            }
        }

    } catch (err) {
        console.error("STT error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, {
            text: t('stt.error', {}, userLang)
        }, { quoted: message });
    }
}

module.exports = sttCommand;
