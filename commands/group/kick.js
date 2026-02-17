const isAdmin = require('../lib/isAdmin');
const { t } = require('../lib/language');
const { isOwner } = require('../lib/ownerCheck');

async function kickCommand(sock, chatId, msg, args, commands, userLang) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // Check if user is owner
    const isUserOwner = isOwner(msg);
    if (!isUserOwner) {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: t('group.bot_admin', {}, userLang) }, { quoted: msg });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: t('group.admin_only', {}, userLang) }, { quoted: msg });
            return;
        }
    } else {
        // Even if owner, bot must be admin to kick
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: t('group.bot_admin', {}, userLang) }, { quoted: msg });
            return;
        }
    }

    let usersToKick = [];

    // Check for mentioned users
    if (mentionedJids && mentionedJids.length > 0) {
        usersToKick = mentionedJids;
    }
    // Check for replied message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [msg.message.extendedTextMessage.contextInfo.participant];
    }

    // If no user found through either method
    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, {
            text: t('group.kick_usage', {}, userLang)
        }, { quoted: msg });
        return;
    }

    // Get bot's ID
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    // Check if any of the users to kick is the bot itself
    if (usersToKick.includes(botId)) {
        await sock.sendMessage(chatId, {
            text: t('group.kick_self', {}, userLang)
        }, { quoted: msg });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");

        // Get usernames for each kicked user
        const usernames = await Promise.all(usersToKick.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        await sock.sendMessage(chatId, {
            text: t('group.kick_success', { users: usernames.join(', ') }, userLang),
            mentions: usersToKick
        });
    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, {
            text: t('group.kick_error', {}, userLang)
        });
    }
}

module.exports = kickCommand;
