const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { isOwner, sendOwnerOnlyMessage } = require('../lib/ownerCheck');
const settings = require('../settings');

async function backupCommand(sock, chatId, msg, args) {
    // Check owner
    if (!isOwner(msg)) {
        return await sendOwnerOnlyMessage(sock, chatId, msg);
    }

    try {
        await sock.sendMessage(chatId, { text: "📦 *جاري تجهيز نسخة احتياطية من ملفات البوت...*" }, { quoted: msg });

        // React with 📦
        await sock.sendMessage(chatId, { react: { text: "📦", key: msg.key } });

        const zip = new AdmZip();
        const rootDir = path.join(__dirname, '..');

        // Exclude list
        const exclude = [
            'node_modules',
            'sessions',
            '.git',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            'tmp',
            '.npm',
            'backup.zip' // Avoid zipping the backup itself if it exists
        ];

        const files = fs.readdirSync(rootDir);

        for (const file of files) {
            if (exclude.includes(file)) continue;

            const fullPath = path.join(rootDir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                zip.addLocalFolder(fullPath, file);
            } else {
                zip.addLocalFile(fullPath);
            }
        }

        const buffer = zip.toBuffer();
        const backupName = `${settings.botName}_Backup_${new Date().toISOString().split('T')[0]}.zip`;

        // Send to owner private chat
        const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        await sock.sendMessage(ownerJid, {
            document: buffer,
            fileName: backupName,
            mimetype: 'application/zip',
            caption: `📦 *نسخة احتياطية لسكربت البوت*\n\n📅 التاريخ: ${new Date().toLocaleString()}\n🤖 البوت: ${settings.botName}`
        });

        // Inform user in current chat if it's not the owner private chat
        if (chatId !== ownerJid) {
            await sock.sendMessage(chatId, { text: "✅ *تم إرسال الملف لخاص المالك بنجاح.*" }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Backup Error:', error);
        await sock.sendMessage(chatId, { text: `❌ *فشل إنشاء النسخة الاحتياطية!*\n⚠️ السبب: ${error.message}` }, { quoted: msg });
    }
}

module.exports = backupCommand;
