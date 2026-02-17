const { sendWithChannelButton } = require('../lib/channelButton');
const { isOwner } = require('../lib/ownerCheck');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const PMBLOCKER_PATH = path.join(__dirname, '../data/pmblocker.json');
const DEFAULT_PM_MESSAGE = `⚠️ الرسائل الخاصة محظورة!

مرحباً! أنا ${settings.botName} 👋
عذراً، نظام الحماية مفعّل. نحن نتخصص في تصميم المواقع وتطوير البوتات الاحترافية.

🚀 *شوف المشاريع ديالي كاملة:*
${settings.portfolio}

🔗 *روابط التواصل:*
📸 *Instagram:* ${settings.instagram}
👤 *Facebook:* ${settings.facebookPage}
✈️ *Telegram:* ${settings.telegram}
🎥 *YouTube:* ${settings.youtube}
👥 *المجموعات:* ${settings.waGroups}
🔔 *القناة:* ${settings.officialChannel}

📲 *تواصل مباشر مع المالك:*
https://wa.me/${settings.ownerNumber[0]}

💡 نحن نحول أفكارك إلى واقع رقمي!`;

function readState() {
    try {
        if (!fs.existsSync(PMBLOCKER_PATH)) {
            return { enabled: false, message: DEFAULT_PM_MESSAGE };
        }
        const raw = fs.readFileSync(PMBLOCKER_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return {
            enabled: !!data.enabled,
            message: typeof data.message === 'string' && data.message.trim() ? data.message : DEFAULT_PM_MESSAGE
        };
    } catch (e) {
        console.error('Error reading PM blocker state:', e);
        return { enabled: false, message: DEFAULT_PM_MESSAGE };
    }
}

function writeState(enabled, message) {
    try {
        const dir = path.dirname(PMBLOCKER_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const current = readState();
        const payload = {
            enabled: !!enabled,
            message: typeof message === 'string' && message.trim() ? message : current.message
        };
        fs.writeFileSync(PMBLOCKER_PATH, JSON.stringify(payload, null, 2));
    } catch (e) {
        console.error('Error writing PM blocker state:', e);
    }
}

async function pmblockerCommand(sock, chatId, message, args) {
    // Owner only
    if (!isOwner(message)) {
        return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر للمالك فقط!', message);
    }

    const argStr = args.join(' ').trim();
    const [sub, ...rest] = argStr.split(' ');
    const state = readState();

    if (!sub || !['on', 'off', 'status', 'setmsg', 'تفعيل', 'إيقاف', 'حالة'].includes(sub.toLowerCase())) {
        await sendWithChannelButton(sock, chatId, `🚫 *PM BLOCKER - حظر الرسائل الخاصة*

الأوامر المتاحة:

✅ .pmblocker on
   └ تفعيل حظر الرسائل الخاصة

❌ .pmblocker off
   └ إيقاف حظر الرسائل الخاصة

📊 .pmblocker status
   └ عرض الحالة الحالية

📝 .pmblocker setmsg [رسالة]
   └ تخصيص رسالة التحذير

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *ملاحظات:*
▪️ الأمر مخصص للمالك فقط
▪️ عند التفعيل، سيتم حظر أي شخص يرسل رسالة خاصة
▪️ يمكنك تخصيص رسالة التحذير

⚔️ Hamza Amirni Bot`, message);
        return;
    }

    if (sub.toLowerCase() === 'status' || sub.toLowerCase() === 'حالة') {
        const statusMsg = `📊 *حالة PM Blocker*

🔘 الحالة: ${state.enabled ? '✅ مفعّل' : '❌ معطّل'}

📝 *الرسالة الحالية:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${state.message.substring(0, 300)}${state.message.length > 300 ? '...' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ Hamza Amirni Bot`;

        await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
        return;
    }

    if (sub.toLowerCase() === 'setmsg') {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const newMsg = fullText.replace(/^\.pmblocker\s+setmsg\s+/i, '').trim();

        if (!newMsg || newMsg === fullText) {
            await sendWithChannelButton(sock, chatId, `❌ *الرجاء إدخال رسالة!*

📝 الاستخدام:
.pmblocker setmsg [رسالتك]

💡 مثال:
.pmblocker setmsg عذراً، الرسائل الخاصة محظورة حالياً

⚔️ Hamza Amirni Bot`, message);
            return;
        }

        writeState(state.enabled, newMsg);
        await sendWithChannelButton(sock, chatId, `✅ *تم تحديث رسالة PM Blocker!*

📝 الرسالة الجديدة:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${newMsg.substring(0, 500)}${newMsg.length > 500 ? '...' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ Hamza Amirni Bot`, message);
        return;
    }

    const enable = sub.toLowerCase() === 'on' || sub.toLowerCase() === 'تفعيل';
    writeState(enable);

    if (enable) {
        return await sendWithChannelButton(sock, chatId, `✅ *تم تفعيل PM Blocker!*

🚫 سيتم الآن:
• إرسال رسالة تحذير لأي شخص يرسل رسالة خاصة
• حظر الشخص تلقائياً

💡 لإيقافه: .pmblocker off

⚔️ Hamza Amirni Bot`, message);
    } else {
        return await sendWithChannelButton(sock, chatId, `❌ *تم إيقاف PM Blocker!*

✅ يمكن الآن للجميع إرسال رسائل خاصة

💡 لتفعيله: .pmblocker on

⚔️ Hamza Amirni Bot`, message);
    }
}

module.exports = pmblockerCommand;
module.exports.readState = readState;
