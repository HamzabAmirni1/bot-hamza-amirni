const { sendWithChannelButton } = require('../../lib/channelButton');
const fs = require('fs');

const ANTICALL_PATH = './data/anticall.json';

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) {
            // Default: enabled and action is 'block'
            writeState(true, 'block');
            return { enabled: true, action: 'block' };
        }
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return {
            enabled: !!data.enabled,
            action: data.action || 'block' // Default to block if not set
        };
    } catch {
        return { enabled: true, action: 'block' };
    }
}

function writeState(enabled, action) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });

        // Preserve existing action if not provided
        let currentAction = 'block';
        try {
            if (fs.existsSync(ANTICALL_PATH)) {
                const current = JSON.parse(fs.readFileSync(ANTICALL_PATH, 'utf8'));
                currentAction = current.action || 'block';
            }
        } catch { }

        const finalAction = action || currentAction;

        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({
            enabled: !!enabled,
            action: finalAction
        }, null, 2));
    } catch { }
}

async function anticallCommand(sock, chatId, msg, args) {
    const { isOwner, sendOwnerOnlyMessage } = require('../../lib/ownerCheck');

    // Owner-only command
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    const currentState = readState();
    // args is an array if coming from handler.js
    const subText = Array.isArray(args) ? args[0] : args;
    const sub = (subText || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status' && sub !== 'block' && sub !== 'reject')) {
        await sendWithChannelButton(sock, chatId, `📵 *نظام منع المكالمات - ANTICALL*
        
الحالة الحالية: ${currentState.enabled ? '✅ مفعّل' : '⚠️ معطّل'}
الإجراء: ${currentState.action === 'block' ? '🚫 حظر (Block)' : '📞 رفض فقط (Reject)'}

الأوامر:
• .anticall on     - تفعيل النظام
• .anticall off    - إيقاف النظام
• .anticall block  - تفعيل الحظر (بلوك) للمتصل
• .anticall reject - تفعيل الرفض فقط (بدون بلوك)
• .anticall status - عرض الحالة

⚔️ bot hamza amirni` , msg);
        return;
    }

    if (sub === 'status') {
        const statusMsg = `📵 *حالة نظام منع المكالمات*

الحالة: ${currentState.enabled ? '✅ *مفعّل*' : '⚠️ *معطّل*'}
الإجراء: ${currentState.action === 'block' ? '🚫 *حظر تلقائي* (Block)' : '📞 *رفض المكالمة فقط*'}

${currentState.enabled ? '🛡️ البوت يحمي نفسه من الإزعاج.' : '⚠️ النظام متوقف.'}

⚔️ bot hamza amirni`;
        await sendWithChannelButton(sock, chatId, statusMsg, msg);
        return;
    }

    if (sub === 'block') {
        writeState(true, 'block');
        return await sendWithChannelButton(sock, chatId, `✅ *تم تفعيل الحظر التلقائي!*\n\nأي شخص سيتصل بالبوت سيتم:\n1. رفض المكالمة 📞\n2. حظره فوراً 🚫`, msg);
    }

    if (sub === 'reject') {
        writeState(true, 'reject');
        return await sendWithChannelButton(sock, chatId, `✅ *تم تفعيل وضع الرفض فقط!*\n\nسيتم رفض المكالمات دون حظر المستخدم.`, msg);
    }

    const enable = sub === 'on';
    writeState(enable, currentState.action); // Keep existing action

    const responseMsg = `📵 *نظام منع المكالمات*

${enable ? '✅ تم التفعيل بنجاح!' : '⚠️ تم الإيقاف مؤقتاً'}

الحالة: ${enable ? '*مفعّل* 🛡️' : '*معطّل* ⚠️'}
الإجراء الحالي: ${currentState.action === 'block' ? 'حظر (Block)' : 'رفض (Reject)'}

⚔️ bot hamza amirni`;
    await sendWithChannelButton(sock, chatId, responseMsg, msg);
}

anticallCommand.readState = readState;
module.exports = anticallCommand;
