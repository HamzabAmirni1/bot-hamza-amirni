const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');
const { t } = require('../lib/language');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');

async function unbanCommand(sock, chatId, msg, args) {
    // Owner-only command
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    let userToUnban;

    // Check for mentioned users
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToUnban = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        userToUnban = msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToUnban) {
        await sock.sendMessage(chatId, {
            text: t('moderation.unban_usage'),
            ...channelInfo
        });
        return;
    }

    try {
        const bannedPath = './data/banned.json';
        if (!fs.existsSync(bannedPath)) {
            await sock.sendMessage(chatId, { text: t('moderation.unban_not_exists', { user: userToUnban.split('@')[0] }), mentions: [userToUnban], ...channelInfo });
            return;
        }

        const bannedUsers = JSON.parse(fs.readFileSync(bannedPath));
        const index = bannedUsers.indexOf(userToUnban);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));

            await sock.sendMessage(chatId, {
                text: t('moderation.unban_success', { user: userToUnban.split('@')[0] }),
                mentions: [userToUnban],
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, {
                text: t('moderation.unban_not_exists', { user: userToUnban.split('@')[0] }),
                mentions: [userToUnban],
                ...channelInfo
            });
        }
    } catch (error) {
        console.error('Error in unban command:', error);
        await sock.sendMessage(chatId, { text: t('moderation.unban_error'), ...channelInfo });
    }
}

module.exports = unbanCommand; 
