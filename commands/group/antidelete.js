const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const settings = require('../settings');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to clean temp folder if size exceeds 100MB
const cleanTempFolderIfLarge = () => {
    try {
        const files = fs.readdirSync(TEMP_MEDIA_DIR);
        let totalSize = 0;
        for (const file of files) {
            totalSize += fs.statSync(path.join(TEMP_MEDIA_DIR, file)).size;
        }
        if (totalSize / (1024 * 1024) > 100) {
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file));
            }
        }
    } catch (err) { }
};
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// Load config
function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: true }; // Default to true for premium feel
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: true };
    }
}

// Save config
function saveConfig(config) {
    try {
        if (!fs.existsSync(path.dirname(CONFIG_PATH))) fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) { }
}

// Main Command Handler
async function antideleteCommand(sock, chatId, msg, args) {
    const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');
    if (!isOwner(msg)) return await sendOwnerOnlyMessage(sock, chatId, msg);

    const config = loadConfig();
    const arg = (args[0] || '').toLowerCase();

    if (arg === 'on') {
        config.enabled = true;
        saveConfig(config);
        await sock.sendMessage(chatId, { text: '✅ *تم تفعيل منع الحذف بنجاح!*' }, { quoted: msg });
    } else if (arg === 'off') {
        config.enabled = false;
        saveConfig(config);
        await sock.sendMessage(chatId, { text: '❌ *تم إيقاف منع الحذف.*' }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, {
            text: `🛡️ *نظام منع الحذف - ANTIDELETE*\n\nالحالة الحالية: ${config.enabled ? '✅ مفعّل' : '❌ معطّل'}\n\n📝 *الأوامر:*\n• .antidelete on\n• .antidelete off\n\n💡 سيقوم البوت بإعادة إرسال أي رسالة محذوفة إلى المالك.`,
            quoted: msg
        });
    }
}

// Store incoming messages
async function storeMessage(sock, message) {
    try {
        const config = loadConfig();
        if (!config.enabled || !message.message) return;
        if (message.key.fromMe) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';

        const sender = message.key.participant || message.key.remoteJid;

        // Detect content
        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        // Limit store size to 1000 messages
        if (messageStore.size > 1000) {
            const firstKey = messageStore.keys().next().value;
            messageStore.delete(firstKey);
        }

    } catch (err) { }
}

// Handle message revocation
async function handleMessageRevocation(sock, update) {
    try {
        const config = loadConfig();
        if (!config.enabled) return;

        const messageId = update.message.protocolMessage.key.id;
        const deletedBy = update.participant || update.key.participant || update.key.remoteJid;
        const ownerNumber = Array.isArray(settings.ownerNumber) ? settings.ownerNumber[0] : settings.ownerNumber;
        const ownerJid = ownerNumber + '@s.whatsapp.net';

        // Ignore if deleted by bot itself or owner
        if (deletedBy.includes(sock.user.id.split(':')[0]) || settings.ownerNumber.includes(deletedBy.split('@')[0])) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const time = new Date().toLocaleString('ar-MA', { timeZone: 'Africa/Casablanca' });

        let reportText = `🛡️ *تقرير منع الحذف - ANTIDELETE* 🛡️\n\n` +
            `🗑️ *حذف بواسطة:* @${deletedBy.split('@')[0]}\n` +
            `👤 *الكاتب الأصلي:* @${original.sender.split('@')[0]}\n` +
            `🕒 *التوقيت:* ${time}\n`;

        if (original.group) {
            const groupMetadata = await sock.groupMetadata(original.group).catch(() => null);
            reportText += `👥 *المجموعة:* ${groupMetadata ? groupMetadata.subject : 'غير معروفة'}\n`;
        }

        if (original.content) {
            reportText += `\n💬 *الرسالة المحذوفة:*\n${original.content}`;
        }

        // Send to owner
        await sock.sendMessage(ownerJid, {
            text: reportText,
            mentions: [deletedBy, original.sender]
        });

        // Send media if exists
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            try {
                const mediaOptions = {
                    caption: `📥 *ميديا محذوفة من:* @${original.sender.split('@')[0]}`,
                    mentions: [original.sender]
                };

                const mediaBuffer = fs.readFileSync(original.mediaPath);

                if (original.mediaType === 'image') {
                    await sock.sendMessage(ownerJid, { image: mediaBuffer, ...mediaOptions });
                } else if (original.mediaType === 'video') {
                    await sock.sendMessage(ownerJid, { video: mediaBuffer, ...mediaOptions });
                } else if (original.mediaType === 'sticker') {
                    await sock.sendMessage(ownerJid, { sticker: mediaBuffer });
                }
            } catch (e) { }
        }

        messageStore.delete(messageId);
    } catch (err) { }
}

antideleteCommand.storeMessage = storeMessage;
antideleteCommand.handleMessageRevocation = handleMessageRevocation;
module.exports = antideleteCommand;
