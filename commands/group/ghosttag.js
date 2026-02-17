const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');
const settings = require('../settings');
const { t } = require('../lib/language');

async function ghostTagCommand(sock, chatId, msg, args) {
    // Check owner
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    let jid = chatId;
    const text = args.join(' ').trim();

    // If a group JID is provided as text, use it
    if (text && text.endsWith('@g.us')) {
        jid = text;
    }

    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: t('group.ghosttag_group_only') }, { quoted: msg });
    }

    try {
        const groupMetadata = await sock.groupMetadata(jid);
        const participants = groupMetadata.participants.map(p => p.id);

        const album = await generateWAMessageFromContent(
            jid,
            {
                albumMessage: {
                    expectedImageCount: 0,
                    expectedVideoCount: 0,
                    contextInfo: {
                        mentionedJid: participants
                    }
                }
            },
            { userJid: sock.user.id }
        );

        await sock.relayMessage(jid, album.message, {
            messageId: album.key.id
        });

        if (chatId !== jid) {
            await sock.sendMessage(chatId, { text: t('group.ghosttag_success', { groupName: groupMetadata.subject }) }, { quoted: msg });
        } else {
            // Optional: react or delete original message if possible to keep it "ghost"
            await sock.sendMessage(chatId, { react: { text: "👻", key: msg.key } });
        }

    } catch (error) {
        console.error('Error in GhostTag:', error);
        await sock.sendMessage(chatId, { text: t('group.ghosttag_error', { error: error.message }) }, { quoted: msg });
    }
}

module.exports = ghostTagCommand;
