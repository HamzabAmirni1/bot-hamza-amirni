const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { isOwner } = require('../lib/ownerCheck');
const { sendWithChannelButton } = require('../lib/channelButton');

// Path to store dynamic config
const DYNAMIC_CONFIG = path.join(__dirname, '../data/config.json');

// Ensure config file exists
function ensureConfig() {
    try {
        const dir = path.dirname(DYNAMIC_CONFIG);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(DYNAMIC_CONFIG)) {
            fs.writeFileSync(DYNAMIC_CONFIG, JSON.stringify({ AUTOREAD: "false" }, null, 2));
        }
    } catch (e) {
        console.error('Error ensuring config:', e);
    }
}

async function autoReadCommand(sock, chatId, msg, args) {
    if (!isOwner(msg)) {
        return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر للمالك فقط!', msg);
    }

    try {
        ensureConfig();

        let config = { AUTOREAD: "false" };
        if (fs.existsSync(DYNAMIC_CONFIG)) {
            config = JSON.parse(fs.readFileSync(DYNAMIC_CONFIG));
        }

        const action = args[0]?.toLowerCase();

        if (action === 'on' || action === 'تفعيل') {
            config.AUTOREAD = "true";
            fs.writeFileSync(DYNAMIC_CONFIG, JSON.stringify(config, null, 2));
            return await sendWithChannelButton(sock, chatId, '✅ *تم تفعيل القراءة التلقائية (Auto-Read)!*\n\n📖 سيتم القراءة (Blue Tick) لجميع الرسائل فور وصولها.\n\n💡 لإيقافها: .autoread off', msg);
        } else if (action === 'off' || action === 'إيقاف') {
            config.AUTOREAD = "false";
            fs.writeFileSync(DYNAMIC_CONFIG, JSON.stringify(config, null, 2));
            return await sendWithChannelButton(sock, chatId, '❌ *تم إيقاف القراءة التلقائية!*\n\n⚠️ لن يتم تأشير الرسائل كـ "مقروءة" تلقائياً.\n\n💡 لتفعيلها: .autoread on', msg);
        } else {
            const currentStatus = config.AUTOREAD === "true" ? 'مفعّل ✅' : 'معطّل ❌';
            await sock.sendMessage(chatId, {
                text: `📖 *إعداد القراءة التلقائية*\n\n` +
                    `الحالة الحالية: *${currentStatus}*\n\n` +
                    `الأوامر المتاحة:\n` +
                    `• ${settings.prefix}autoread on - للتفعيل\n` +
                    `• ${settings.prefix}autoread off - للإيقاف\n\n` +
                    `⚔️ ${settings.botName}`
            }, { quoted: msg });
        }
    } catch (e) {
        console.error('Error in autoread command:', e);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء تغيير الإعدادات.' }, { quoted: msg });
    }
}

module.exports = autoReadCommand;
