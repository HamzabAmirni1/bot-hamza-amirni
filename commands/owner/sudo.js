const settings = require('../../settings');
const { isOwner } = require('../../lib/ownerCheck');

module.exports = async (sock, chatId, msg, args) => {
    // Check if sender is owner using the robust helper
    if (!isOwner(msg)) {
        return sock.sendMessage(chatId, { text: '❌ هذا الأمر للمالك فقط!' }, { quoted: msg });
    }

    if (!args[0]) return sock.sendMessage(chatId, { text: '💻 يرجى كتابة الكود لتنفيذه.' }, { quoted: msg });

    const code = args.join(' ');

    try {
        let evaled = await eval(`(async () => { ${code} })()`);

        // Handle result display
        if (evaled === undefined) return;
        if (typeof evaled !== "string") evaled = require("util").inspect(evaled);

        await sock.sendMessage(chatId, { text: evaled }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ الخطأ:\n${String(err)}` }, { quoted: msg });
    }
};
