const settings = require('../settings');
const { t } = require('../lib/language');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const uptime = process.uptime();
        const duration = formatUptime(uptime);

        const aliveText = t('alive.text', {
            botName: t('common.botName', {}, userLang),
            duration: duration,
            botOwner: t('common.botOwner', {}, userLang),
            prefix: settings.prefix
        }, userLang);

        await sock.sendMessage(chatId, {
            text: aliveText
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: t('alive.error', {}, userLang) }, { quoted: msg });
    }
};

function formatUptime(seconds) {
    function pad(s) { return (s < 10 ? '0' : '') + s; }
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor(seconds % (60 * 60) / 60);
    var seconds = Math.floor(seconds % 60);
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}
