const fetch = require('node-fetch');
const settings = require('../settings');

async function simpCommand(sock, chatId, msg, args) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            ? {
                sender: msg.message.extendedTextMessage.contextInfo.participant || msg.message.extendedTextMessage.contextInfo.remoteJid
            }
            : null;

        // Determine the target user
        let who = quotedMsg
            ? quotedMsg.sender
            : mentionedJid && mentionedJid[0]
                ? mentionedJid[0]
                : sender;

        await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } });

        // Get the profile picture URL
        let avatarUrl;
        try {
            avatarUrl = await sock.profilePictureUrl(who, 'image');
        } catch (error) {
            console.error('Error fetching profile picture:', error);
            avatarUrl = 'https://ui-avatars.com/api/?name=User&background=random&size=512'; // Default avatar
        }

        // Fetch the simp card from the API
        const apiUrl = `https://some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(avatarUrl)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        // Get the image buffer
        const imageBuffer = await response.buffer();

        // Send the image with caption (High Compatibility Mode)
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: '> Your Dump ✨',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Error in simp command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Sorry, I couldn\'t generate the simp card. Please try again later!',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: msg });
    }
}

module.exports = simpCommand;
