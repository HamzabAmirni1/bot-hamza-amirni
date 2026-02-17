const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

/**
 * Handle manual promotions via command
 */
async function promoteCommand(sock, chatId, msg, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // Check if it's a group
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: t('group.group_only') }, { quoted: msg });
        return;
    }

    // Check admin status
    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { text: t('group.bot_admin') }, { quoted: msg });
        return;
    }
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { text: t('group.admin_only') }, { quoted: msg });
        return;
    }

    let userToPromote = [];

    // Check for mentioned users
    if (mentionedJids && mentionedJids.length > 0) {
        userToPromote = mentionedJids;
    }
    // Check for replied message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        userToPromote = [msg.message.extendedTextMessage.contextInfo.participant];
    }

    // If no user found
    if (userToPromote.length === 0) {
        await sock.sendMessage(chatId, { text: t('group.promote_usage') }, { quoted: msg });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");

        const usernames = userToPromote.map(jid => `@${jid.split('@')[0]}`);
        const promoterJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const promotionMessage = `${t('group.promote_success_title')}\n\n` +
            `${t('group.promoted_users')}\n` +
            `${usernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `${t('group.promoted_by', { user: `@${senderId.split('@')[0]}` })}\n\n` +
            `${t('group.date', { date: new Date().toLocaleString() })}`;

        await sock.sendMessage(chatId, {
            text: promotionMessage,
            mentions: [...userToPromote, senderId]
        }, { quoted: msg });
    } catch (error) {
        console.error('Error in promote command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
}

/**
 * Handle automatic promotion detection (to be called from index.js)
 */
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        const promotedUsernames = participants.map(jid => `@${jid.split('@')[0]}`);
        let promotedBy = author ? `@${author.split('@')[0]}` : t('group.system');
        let mentionList = [...participants];
        if (author) mentionList.push(author);

        const promotionMessage = `${t('group.promote_success_title')}\n\n` +
            `${t('group.promoted_users')}\n` +
            `${promotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `${t('group.promoted_by', { user: promotedBy })}\n\n` +
            `${t('group.date', { date: new Date().toLocaleString() })}`;

        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Error handling promotion event:', error);
    }
}

promoteCommand.handlePromotionEvent = handlePromotionEvent;
module.exports = promoteCommand;
