const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');

async function clearSessionCommand(sock, chatId, msg, args) {
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    const isFullReset = args[0] === 'full';

    try {
        const sessionDir = path.join(process.cwd(), 'session');
        if (!fs.existsSync(sessionDir)) {
            return await sock.sendMessage(chatId, { text: '❌ مجلد الجلسة (session) غير موجود.' });
        }

        const files = fs.readdirSync(sessionDir);
        let deletedCount = 0;

        // If 'full' is passed, request confirmation or just do it (for owners)
        // We delete everything including creds.json if isFullReset
        files.forEach(file => {
            if (isFullReset || file !== 'creds.json') {
                try {
                    const filePath = path.join(sessionDir, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                } catch (e) {
                    console.error(`Failed to delete session file ${file}:`, e.message);
                }
            }
        });

        if (isFullReset) {
            await sock.sendMessage(chatId, {
                text: `☢️ *تم حذف الجلسة بالكامل (${deletedCount} ملف)!*\n\nسيتم إيقاف البوت الآن. يرجى إعادة التشغيل والمسح الضوئي من جديد.\n\n👋 وداعاً!`
            }, { quoted: msg });
            // Exit process to force restart (if using PM2/Docker it will auto-restart)
            setTimeout(() => process.exit(0), 1000);
        } else {
            await sock.sendMessage(chatId, {
                text: `✅ تم تنظيف *${deletedCount}* ملف من الجلسة (تم الاحتفاظ بـ creds.json).\n\n💡 إذا استمرت مشكلة "Bad MAC"، استخدم:\n*${settings.prefix}clearsession full*\nلحذف الجلسة بالكامل وإعادة المصادقة.`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in clearsession command:', error);
        await sock.sendMessage(chatId, { text: '❌ فشل تنظيف ملفات الجلسة.' });
    }
}

module.exports = clearSessionCommand;
