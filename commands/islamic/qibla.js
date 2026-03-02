const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function qiblaCommand(sock, chatId, message, args) {
    const qiblaMsg = `🕋 *كيفية تحديد اتجاه القبلة* 🕋\n\n` +
        `📍 *باستخدام الهاتف:* \n` +
        `يمكنك استخدام تطبيق "Qibla Finder" من جوجل لمشاهدة القبلة مباشرة بالكاميرا:\n` +
        `🔗 https://qiblafinder.withgoogle.com/\n\n` +
        `📐 *معلومات تقنية:* \n` +
        `• مكة المكرمة: 21.4225° N, 39.8262° E\n` +
        `• استخدم البوصلة في هاتفك للحصول على أدق اتجاه.\n\n` +
        `⚔️ ${settings.botName}`;

    await sendWithChannelButton(sock, chatId, qiblaMsg, message);
}

module.exports = qiblaCommand;
