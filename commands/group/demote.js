const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');

/**
 * Handle manual demotions via command
 */
async function demoteCommand(sock, chatId, msg, args) {
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

    let userToDemote = [];

    // Check for mentioned users
    if (mentionedJids && mentionedJids.length > 0) {
        userToDemote = mentionedJids;
    }
    // Check for replied message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        userToDemote = [msg.message.extendedTextMessage.contextInfo.participant];
    }

    // If no user found
    if (userToDemote.length === 0) {
        await sock.sendMessage(chatId, { text: t('group.demote_usage') }, { quoted: msg });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");

        const usernames = userToDemote.map(jid => `@${jid.split('@')[0]}`);

        const demotionMessage = `${t('group.demote_success_title')}\n\n` +
            `${t('group.demoted_users')}\n` +
            `${usernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `${t('group.demoted_by', { user: `@${senderId.split('@')[0]}` })}\n\n` +
            `${t('group.date', { date: new Date().toLocaleString() })}`;

        await sock.sendMessage(chatId, {
            text: demotionMessage,
            mentions: [...userToDemote, senderId]
        }, { quoted: msg });
    } catch (error) {
        console.error('Error in demote command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
}

/**
 * Handle automatic demotion detection
 */
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        const demotedUsernames = participants.map(jid => `@${jid.split('@')[0]}`);
        let demotedBy = author ? `@${author.split('@')[0]}` : t('group.system');
        let mentionList = [...participants];
        if (author) mentionList.push(author);

        const demotionMessage = `${t('group.demote_success_title')}\n\n` +
            `${t('group.demoted_users')}\n` +
            `${demotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `${t('group.demoted_by', { user: demotedBy })}\n\n` +
            `${t('group.date', { date: new Date().toLocaleString() })}`;

        await sock.sendMessage(groupId, {
            text: demotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Error handling demotion event:', error);
    }
}

demoteCommand.handleDemotionEvent = handleDemotionEvent;
module.exports = demoteCommand;
