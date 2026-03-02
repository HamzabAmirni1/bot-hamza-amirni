const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const { isOwner } = require('../../lib/ownerCheck');

// Path to store dynamic settings
const DYNAMIC_CONFIG = path.join(__dirname, '../../data/dynamicConfig.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DYNAMIC_CONFIG))) {
    fs.mkdirSync(path.dirname(DYNAMIC_CONFIG), { recursive: true });
}

// Initial state
let config = {
    mode: settings.commandMode || 'public'
};

// Load saved config if exists
if (fs.existsSync(DYNAMIC_CONFIG)) {
    try {
        config = JSON.parse(fs.readFileSync(DYNAMIC_CONFIG));
    } catch (e) {
        console.error('Error loading dynamic config:', e);
    }
}

async function modeCommand(sock, chatId, message, args) {
    if (!isOwner(message)) {
        // Only owner can change mode
        return;
    }

    const commandText = message.message?.conversation ||
        message.message?.extendedTextMessage?.text || '';

    // Determine which command was called based on aliases or text
    const cmd = commandText.slice(settings.prefix.length).trim().split(' ')[0].toLowerCase();

    let newMode = '';
    if (cmd === 'public') {
        newMode = 'public';
    } else if (cmd === 'self' || cmd === 'private') {
        newMode = 'self';
    } else if (cmd === 'groups' || cmd === 'group') {
        newMode = 'groups';
    }

    if (newMode) {
        config.mode = newMode;
        fs.writeFileSync(DYNAMIC_CONFIG, JSON.stringify(config, null, 2));

        let statusText = '';
        if (newMode === 'public') statusText = 'العام (Public) 🔓';
        else if (newMode === 'self') statusText = 'الخاص (Self) 🔒';
        else if (newMode === 'groups') statusText = 'المجموعات فقط (Groups Only) 👥';

        let description = '';
        if (newMode === 'public') description = 'يمكن للجميع الآن استخدام أوامر البوت.';
        else if (newMode === 'self') description = 'يمكن للمالك فقط استخدام أوامر البوت حالياً.';
        else if (newMode === 'groups') description = 'البوت سيعمل الآن في المجموعات فقط.';

        await sock.sendMessage(chatId, {
            text: `✅ تم تغيير وضع البوت إلى: *${statusText}*\n\n${description}`
        }, { quoted: message });
    } else {
        // Show current status and help
        const currentMode = getBotMode();
        let statusText = '';
        if (currentMode === 'public') statusText = 'العام (Public) 🔓';
        else if (currentMode === 'self') statusText = 'الخاص (Self) 🔒';
        else if (currentMode === 'groups') statusText = 'المجموعات فقط (Groups Only) 👥';

        const helpMsg = `🤖 *إعدادات وضع البوت*
        
📌 *الوضع الحالي:* ${statusText}

📝 *الأوامر المتاحة:*
━━━━━━━━━━━━━━━━━━━━━━━━
🔓 *.public* - تفعيل الوضع العام (للجميع)
🔒 *.self* - تفعيل الوضع الخاص (للمالك فقط)
👥 *.groups* - تفعيل وضع المجموعات فقط
━━━━━━━━━━━━━━━━━━━━━━━━

💡 في الوضع الخاص، البوت يستجيب فقط لأوامر المالك.
💡 في وضع المجموعات، البوت يتجاهل الأوامر في الخاص (إلا من المالك).

⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: helpMsg }, { quoted: message });
    }
}

// Helper function to check if bot should respond
function getBotMode() {
    if (fs.existsSync(DYNAMIC_CONFIG)) {
        try {
            const data = JSON.parse(fs.readFileSync(DYNAMIC_CONFIG));
            return data.mode || 'public';
        } catch (e) { }
    }
    return config.mode;
}

modeCommand.getBotMode = getBotMode;
module.exports = modeCommand;
