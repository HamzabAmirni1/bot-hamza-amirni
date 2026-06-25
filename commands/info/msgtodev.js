const { db } = require('../../lib/supabase');
const chalk = require('chalk');

module.exports = async (sock, chatId, msg, args, helpers, userLang) => {
    try {
        const text = args.join(" ").trim();
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "⚠️ *المرجو كتابة الرسالة بعد الأمر.*\nمثال: `.msgtodev السلام عليكم، لدي اقتراح...`" 
            }, { quoted: msg });
        }

        // Platform is always whatsapp for this bot
        const platform = 'whatsapp';
        const senderId = chatId.replace('@s.whatsapp.net', '');
        const senderName = msg.pushName || 'مستخدم غير معروف';

        const newMsg = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            sender: senderId,
            senderName: senderName,
            platform: platform,
            text: text,
            timestamp: new Date().toISOString()
        };

        // Save directly to the dev_messages table in Supabase
        const saved = await db.saveDevMessage(newMsg);
        if (!saved) throw new Error('فشل الحفظ في قاعدة البيانات');

        const replyText = `✅ *تم إرسال رسالتك إلى المطور بنجاح!*\n\n📝 *الرسالة المرسلة:* "${text}"\n\nسوف يقوم المطور بقراءتها والرد عليك مباشرة هنا في أقرب وقت. شكراً لتواصلك.`;
        await sock.sendMessage(chatId, { text: replyText }, { quoted: msg });

        console.log(chalk.green(`[msgtodev] ✅ Saved to DB from ${senderName} (${senderId}) on ${platform}`));

    } catch (e) {
        console.error("[msgtodev Error]:", e.message);
        await sock.sendMessage(chatId, { text: "❌ فشل إرسال الرسالة، يرجى المحاولة مرة أخرى لاحقاً." }, { quoted: msg });
    }
};
