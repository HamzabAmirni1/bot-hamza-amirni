const yts = require('yt-search');
const { t } = require('../lib/language');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    const query = args.join(' ');

    if (!query) {
        await sock.sendMessage(chatId, {
            text: t('yts.usage', { prefix: settings.prefix, botName: settings.botName }, userLang)
        }, { quoted: msg });
        return;
    }

    // Reaction for fetching
    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const results = await yts(query);
        const videos = results.videos.slice(0, 15);

        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, { text: t('yts.no_result', {}, userLang) }, { quoted: msg });
            return;
        }

        let teks = `🔍 *YouTube Search Results (Server 2)*\n\n`;

        teks += videos.map((v, i) => {
            return `*${i + 1}. ${v.title}*\n` +
                   `🔗 *Link:* ${v.url}\n` +
                   `🕒 *Duration:* ${v.timestamp}\n` +
                   `👁 *Views:* ${v.views}\n` +
                   `📅 *Uploaded:* ${v.ago}\n` +
                   `👤 *Channel:* ${v.author.name}`;
        }).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');

        teks += `\n\n⚔️ *${settings.botName}*`;

        await sock.sendMessage(chatId, {
            image: { url: videos[0].thumbnail },
            caption: teks
        }, { quoted: msg });

    } catch (e) {
        console.error('Error in yts2:', e);
        await sock.sendMessage(chatId, { text: t('common.error', {}, userLang) }, { quoted: msg });
    }
};
