const { db } = require('../../lib/supabase');
const chalk = require('chalk');
const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, chatId, msg, args, helpers, userLang) => {
    try {
        const text = args.join(" ").trim();

        // ─── Usage message (no text provided) ──────────────────────────────
        if (!text) {
            const usageText =
`╔━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╗
┃      ✉️  رِسَـالَـة إلـى الـمُـطَـوِّر      ┃
╚━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╝

📝 *الاستخدام:*
▫️ \`${settings.prefix}msgtodev [رسالتك]\`

💬 *مثال:*
▫️ \`${settings.prefix}msgtodev عندي مشكل في أمر كذا...\`

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
👑 *${settings.botName || 'حمزة اعمرني'}*
╰┈➤ 📢 ${settings.officialChannel || ''}`;

            return await sock.sendMessage(chatId, { text: usageText }, { quoted: msg });
        }

        // ─── Save to DB ────────────────────────────────────────────────────
        const platform = 'whatsapp';
        const senderId = chatId.replace('@s.whatsapp.net', '');
        const senderName = msg.pushName || 'مستخدم غير معروف';

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', timeZone: settings.timezone || 'Africa/Casablanca' });
        const dateStr = now.toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: settings.timezone || 'Africa/Casablanca' });

        const newMsg = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            sender: senderId,
            senderName: senderName,
            platform: platform,
            text: text,
            timestamp: now.toISOString()
        };

        const saved = await db.saveDevMessage(newMsg);
        if (!saved) throw new Error('فشل الحفظ في قاعدة البيانات');

        // ─── Premium confirmation message ──────────────────────────────────
        const replyText =
`╔━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╗
┃      ✉️  رِسَـالَـة إلـى الـمُـطَـوِّر      ┃
╚━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╝

✅ *تم إرسال رسالتك بنجاح!*

📩 *رسالتك:*
_"${text}"_

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🕐 ${timeStr}  •  📅 ${dateStr}
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

💬 _سيقرأها المطور ويرد عليك مباشرة هنا._
🙏 _شكراً لتواصلك معنا!_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *${settings.botName || 'حمزة اعمرني'}*
╰┈➤ 📢 ${settings.officialChannel || ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        // Load thumbnail for premium image reply
        const thumbPath = path.join(process.cwd(), 'media/hamza.jpg');
        const thumbBuf = fs.existsSync(thumbPath) ? fs.readFileSync(thumbPath) : null;

        if (thumbBuf) {
            await sock.sendMessage(chatId, {
                image: thumbBuf,
                caption: replyText
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: replyText }, { quoted: msg });
        }

        console.log(chalk.green(`[msgtodev] ✅ Saved to DB from ${senderName} (${senderId}) on ${platform}`));

    } catch (e) {
        console.error("[msgtodev Error]:", e.message);
        await sock.sendMessage(chatId, {
            text: `❌ *فشل إرسال الرسالة.*\n\n_يرجى المحاولة مرة أخرى لاحقاً._`
        }, { quoted: msg });
    }
};
