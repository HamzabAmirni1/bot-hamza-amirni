const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { isOwner } = require('../../lib/ownerCheck');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function upswgcCommand(sock, chatId, msg, args) {
    // Check if user is owner
    if (!isOwner(msg)) {
        return await sock.sendMessage(chatId, { text: "❌ هذا الأمر للمالك فقط." }, { quoted: msg });
    }

    // Check if in group
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        return await sock.sendMessage(chatId, { text: "❌ هذا الأمر يعمل فقط في المجموعات." }, { quoted: msg });
    }

    const text = args.join(' ');
    let quoted = msg.quoted ? msg.quoted : msg;

    if (!text && !msg.quoted) {
        const helpMsg = `📢 *تحديث حالة المجموعة* 📢

🔹 *الاستخدام:*
${settings.prefix}upswgc [النص]
أو قم بالرد على (صورة/فيديو/صوت) بالأمر لتحديث الحالة.

💡 سيظهر التحديث كرسالة حالة للمجموعة (Group Status).

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        // TEXT ONLY
        if (text && !msg.quoted) {
            await sock.relayMessage(
                chatId,
                {
                    groupStatusMessageV2: {
                        message: { conversation: text }
                    }
                },
                {}
            );
            return await sock.sendMessage(chatId, { text: "✅ تم تحديث حالة المجموعة بنجاح." }, { quoted: msg });
        }

        // MEDIA (IF QUOTED)
        if (msg.quoted) {
            const mime = msg.quoted.mtype === 'imageMessage' ? 'image' :
                msg.quoted.mtype === 'videoMessage' ? 'video' :
                    msg.quoted.mtype === 'audioMessage' ? 'audio' : '';

            const buffer = await msg.quoted.download();

            if (!buffer) return await sock.sendMessage(chatId, { text: "❌ تعذر تحميل الوسائط." }, { quoted: msg });

            let media;

            if (mime === 'image') {
                media = await prepareWAMessageMedia(
                    { image: buffer },
                    { upload: sock.waUploadToServer }
                );
            } else if (mime === 'video') {
                media = await prepareWAMessageMedia(
                    { video: buffer },
                    { upload: sock.waUploadToServer }
                );
            } else if (mime === 'audio') {
                media = await prepareWAMessageMedia(
                    {
                        audio: buffer,
                        mimetype: 'audio/mpeg',
                        ptt: false
                    },
                    { upload: sock.waUploadToServer }
                );
            } else {
                return await sock.sendMessage(chatId, { text: "⚠️ تنسيق الوسائط غير مدعوم." }, { quoted: msg });
            }

            await sock.relayMessage(
                chatId,
                {
                    groupStatusMessageV2: {
                        message: media
                    }
                },
                {}
            );

            return await sock.sendMessage(chatId, { text: "✅ تم تحديث حالة المجموعة بالوسائط بنجاح." }, { quoted: msg });
        }
    } catch (err) {
        console.error('Error in upswgc:', err);
        await sock.sendMessage(chatId, { text: "❌ فشل تحديث حالة المجموعة." }, { quoted: msg });
    }
}

module.exports = upswgcCommand;
