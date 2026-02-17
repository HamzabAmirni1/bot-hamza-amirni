const fs = require('fs');
const path = require('path');
const { t } = require('../lib/language');
const { isOwner } = require('../lib/ownerCheck');

module.exports = async function clearTmpCommand(sock, chatId, message, args) {
    // Only owner can run this
    if (!isOwner(message)) return;

    await sock.sendMessage(chatId, { text: '🧹 Cleaning temporary files...' }, { quoted: message });

    const dirs = [
        path.join(__dirname, '../tmp'),
        path.join(__dirname, '../temp'),
        path.join(__dirname, '../') // Root for specific extensions
    ];

    let deletedCount = 0;
    let freedBytes = 0;

    const extensionsToDelete = ['.tmp', '.backup', '.apk', '.mp3', '.mp4', '.jpg', '.png', '.webp'];

    dirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            // If it's a directory like tmp/temp, delete everything inside
            // If it's root, only delete extensions
            const isRoot = dir === path.join(__dirname, '../');

            try {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            if (!isRoot || extensionsToDelete.some(ext => file.endsWith(ext))) {
                                fs.unlinkSync(filePath);
                                deletedCount++;
                                freedBytes += stats.size;
                            }
                        }
                    } catch (e) {
                        // Ignore errors for individual files
                    }
                });
            } catch (e) {
                console.error(`Error reading dir ${dir}:`, e);
            }
        }
    });

    const freedMb = (freedBytes / (1024 * 1024)).toFixed(2);

    await sock.sendMessage(chatId, {
        text: `✅ Cleanup complete.\n🗑️ Deleted ${deletedCount} files.\n💾 Freed: ${freedMb} MB.`
    }, { quoted: message });
};
