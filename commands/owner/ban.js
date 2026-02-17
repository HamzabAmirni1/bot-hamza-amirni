const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');
const { t } = require('../lib/language');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');

async function banCommand(sock, chatId, msg, args) {
    // Owner-only command
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    let userToBan;

    // Check for mentioned users
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToBan = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        userToBan = msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToBan) {
        await sock.sendMessage(chatId, {
            text: t('moderation.ban_usage'),
            ...channelInfo
        });
        return;
    }

    try {
        // Add user to banned list
        const bannedPath = './data/banned.json';
        if (!fs.existsSync(bannedPath)) {
            fs.writeFileSync(bannedPath, JSON.stringify([], null, 2));
        }

        const bannedUsers = JSON.parse(fs.readFileSync(bannedPath));
        if (!bannedUsers.includes(userToBan)) {
            bannedUsers.push(userToBan);
            fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));

            await sock.sendMessage(chatId, {
                text: t('moderation.ban_success', { user: userToBan.split('@')[0] }),
                mentions: [userToBan],
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, {
                text: t('moderation.ban_exists', { user: userToBan.split('@')[0] }),
                mentions: [userToBan],
                ...channelInfo
            });
        }
    } catch (error) {
        console.error('Error in ban command:', error);
        await sock.sendMessage(chatId, { text: t('moderation.ban_error'), ...channelInfo });
    }
}

module.exports = banCommand;
