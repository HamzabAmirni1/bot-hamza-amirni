const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

// Helper to get directory size (portable but slow)
function getDirSize(dirPath) {
    try {
        let totalSize = 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                totalSize += stats.size;
            } else if (stats.isDirectory()) {
                totalSize += getDirSize(filePath);
            }
        }
        return totalSize;
    } catch (e) {
        return 0;
    }
}

const { isOwner } = require('../lib/ownerCheck');

async function systemCommand(sock, chatId, msg, args) {
    // Check if it's a restart request
    const fullText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();
    const isRestart = fullText.includes('restart') || fullText.includes('reboot');

    if (isRestart) {
        if (!isOwner(msg)) {
            return await sock.sendMessage(chatId, { text: "❌ هاد الأمر خاص غير بالمول (Owner)!" }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: "🔄 جاري إعادة تشغيل البوت... بلاتي شوية." }, { quoted: msg });
        console.log('⚠️ Manual restart requested by owner. Exiting...');
        setTimeout(() => process.exit(1), 1000); // Panel will auto-restart
        return;
    }

    const runtime = process.uptime();
    const hours = Math.floor(runtime / 3600);
    const minutes = Math.floor((runtime % 3600) / 60);
    const seconds = Math.floor(runtime % 60);

    const memoryUsage = process.memoryUsage();
    const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

    const cpuLoad = os.loadavg()[0].toFixed(2);
    const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    // Try to get disk usage
    let diskUsage = 'Unknown';
    try {
        if (os.platform() !== 'win32') {
            // On Linux/Container, use du -sh .
            diskUsage = execSync('du -sh .').toString().split('\t')[0].trim();
        } else {
            // On Windows (Local Dev), just show approximate root folder size
            const size = getDirSize('.');
            diskUsage = (size / 1024 / 1024).toFixed(2) + ' MB';
        }
    } catch (e) {
        diskUsage = 'Error';
    }

    const statusText = `╔═════════════════════════════╗
║    🖥️ *BOT SYSTEM STATUS* ✨
╚═════════════════════════════╝

🤖 *Bot Information:*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *Nom:* ${settings.botName}
▫️ *Owner:* ${settings.botOwner}
▫️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
▫️ *Mode:* ${require('./mode').getBotMode()}

📊 *Server Stats:*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *Memory (RSS):* ${rss} MB
▫️ *Heap Used:* ${heapUsed} MB
▫️ *System CPU:* ${cpuLoad}%
▫️ *RAM Libre:* ${freeRam} GB / ${totalRam} GB
▫️ *Disk Used:* ${diskUsage} 💾
▫️ *Platform:* ${os.platform()} (${os.release()})

📡 *Connection:*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *Type:* WebSocket
▫️ *Status:* Connected ✅

⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, {
        text: statusText
    }, { quoted: msg });
}

module.exports = systemCommand;
