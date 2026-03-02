const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function unblockCommand(sock, chatId, msg, args) {
    const { isOwner, sendOwnerOnlyMessage } = require('../../lib/ownerCheck');

    // Owner-only command
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    try {
        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `❌ *طريقة الاستخدام:*

📝 *لإلغاء حظر شخص:*
.unblock [رقم]

💡 *مثال:*
.unblock 212612345678

⚔️ ${settings.botName}`
            }, { quoted: msg });
        }

        // Get number
        let number = args.join('').replace(/[^0-9]/g, '');
        let targetJid = number.endsWith('@s.whatsapp.net') ? number : number + '@s.whatsapp.net';

        // Unblock the user
        await sock.updateBlockStatus(targetJid, 'unblock');

        const unblockedNumber = targetJid.replace('@s.whatsapp.net', '');

        await sock.sendMessage(chatId, {
            text: `✅ *تم إلغاء الحظر بنجاح!*

✅ المستخدم: ${unblockedNumber}

⚔️ ${settings.botName}`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in unblock command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ فشل إلغاء الحظر: ${error.message}`
        }, { quoted: msg });
    }
}

module.exports = unblockCommand;
