const settings = require('../../settings');

// In-memory store for reminders (Note: This will reset on bot restart. For persistence, use a database or file)
const reminders = new Map();

async function remindCommand(sock, chatId, msg, args) {
    if (!args.length) {
        return await sock.sendMessage(chatId, {
            text: '⏰ *كيفية استخدام التذكير*\n\nالاستخدام: .remind [الوقت] [الرسالة]\n' +
                'أمثلة:\n' +
                '.remind 10s جرب الكود (10 ثواني)\n' +
                '.remind 5m صلي العصر (5 دقائق)\n' +
                '.remind 1h راجع الدروس (ساعة واحدة)'
        }, { quoted: msg });
    }

    const timeArg = args[0];
    const message = args.slice(1).join(' ');

    if (!message) {
        return await sock.sendMessage(chatId, { text: '❌ الرجاء كتابة رسالة التذكير.' }, { quoted: msg });
    }

    const unit = timeArg.slice(-1).toLowerCase();
    const value = parseInt(timeArg.slice(0, -1));

    if (isNaN(value)) {
        return await sock.sendMessage(chatId, { text: '❌ صيغة الوقت غير صحيحة. استخدم s (ثواني)، m (دقائق)، h (ساعات).' }, { quoted: msg });
    }

    let durationMs = 0;
    let unitText = '';

    switch (unit) {
        case 's':
            durationMs = value * 1000;
            unitText = 'ثانية';
            break;
        case 'm':
            durationMs = value * 60 * 1000;
            unitText = 'دقيقة';
            break;
        case 'h':
            durationMs = value * 60 * 60 * 1000;
            unitText = 'ساعة';
            break;
        default:
            return await sock.sendMessage(chatId, { text: '❌ الوحدة غير مدعومة. استخدم s, m, h.' }, { quoted: msg });
    }

    if (durationMs > 24 * 60 * 60 * 1000) {
        return await sock.sendMessage(chatId, { text: '❌ الحد الأقصى للتذكير هو 24 ساعة.' }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { text: `✅ تم ضبط التذكير بعد *${value} ${unitText}*.\n📝 الرسالة: "${message}"` }, { quoted: msg });

    setTimeout(async () => {
        await sock.sendMessage(chatId, {
            text: `⏰ *تذكير!*\n\n${message}`,
            mentions: [msg.key.participant || msg.key.remoteJid]
        }, { quoted: msg });
    }, durationMs);
}

module.exports = remindCommand;
