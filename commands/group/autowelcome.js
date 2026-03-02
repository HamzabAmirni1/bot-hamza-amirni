const { sendWithChannelButton } = require('../../lib/channelButton');
const fs = require('fs');
const path = require('path');

// Path to store auto welcome state
const AUTO_WELCOME_CONFIG = path.join(__dirname, '../data/autowelcome.json');

// Load auto welcome state
function loadAutoWelcomeState() {
    try {
        if (fs.existsSync(AUTO_WELCOME_CONFIG)) {
            const data = JSON.parse(fs.readFileSync(AUTO_WELCOME_CONFIG, 'utf8'));
            return data.enabled !== undefined ? data.enabled : false; // Default: disabled
        }
        return false; // Default: disabled
    } catch (error) {
        return false;
    }
}

// Save auto welcome state
function saveAutoWelcomeState(enabled) {
    try {
        const dir = path.dirname(AUTO_WELCOME_CONFIG);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(AUTO_WELCOME_CONFIG, JSON.stringify({ enabled }, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Command handler
async function autowelcomeCommand(sock, chatId, msg, args) {
    try {
        const { isOwner, sendOwnerOnlyMessage } = require('../../lib/ownerCheck');

        // Owner-only command
        if (!isOwner(msg)) {
            return await sendOwnerOnlyMessage(sock, chatId, msg);
        }

        const command = (args[0] || '').toLowerCase();

        // Show help if no arguments
        if (!command) {
            return await sock.sendMessage(chatId, {
                text: `╭━━━ 👋 *رسالة الترحيب التلقائية* ━━━╮
│
│ *التحكم في رسالة الخاص:*
│
│ ✅ *.autowelcome on*
│    └ تفعيل الرسالة التلقائية
│
│ 🚫 *.autowelcome off*
│    └ تعطيل الرسالة التلقائية
│
│ 📊 *.autowelcome status*
│    └ معرفة الحالة الحالية
│
│ 🎨 *.autowelcome test*
│    └ تجربة شكل الرسالة
│
╰━━━━━━━━━━━━━━━━━━━━━╯

*ملاحظة:*
هذه الرسالة تُرسل تلقائياً لكل شخص
يراسل البوت في الخاص لأول مرة`
            }, { quoted: msg });
        }

        // Check status
        if (command === 'status' || command === 'حالة') {
            const isEnabled = loadAutoWelcomeState();
            const statusEmoji = isEnabled ? '✅' : '❌';
            const statusText = isEnabled ? 'مفعّلة' : 'معطّلة';
            return await sock.sendMessage(chatId, {
                text: `${statusEmoji} *رسالة الترحيب التلقائية:* ${statusText}\n\n${isEnabled ? '💡 استخدم *.autowelcome off* لإيقافها' : '💡 استخدم *.autowelcome on* لتفعيلها'}`
            }, { quoted: msg });
        }

        // Enable auto welcome
        if (command === 'on' || command === 'تفعيل') {
            saveAutoWelcomeState(true);
            return await sock.sendMessage(chatId, {
                text: '✅ تم تفعيل رسالة الترحيب التلقائية!\n\n📨 سيتم إرسال رسالة ترحيب لكل شخص جديد في الخاص'
            }, { quoted: msg });
        }

        // Disable auto welcome
        if (command === 'off' || command === 'تعطيل') {
            saveAutoWelcomeState(false);
            return await sock.sendMessage(chatId, {
                text: '✅ تم تعطيل رسالة الترحيب التلقائية!\n\n🔕 لن يتم إرسال رسائل ترحيب تلقائية في الخاص'
            }, { quoted: msg });
        }

        // Test mode
        if (command === 'test') {
            // We'll simulate the welcome logic from index.js
            const settings = require('../../settings');
            const userName = msg.pushName || 'صديقي';
            const welcomeText = `مرحباً بك يا ${userName} في بوت ${settings.botName}
✨ 👮‍♂️ AMIRNI

أنا هنا لخدمتك ومساعدتك في العديد من المهارات والأوامر الرائعة.

📍 للبدء، أرسل: ${settings.prefix}menu
📋 لمعرفة معلومات عني: ${settings.prefix}owner

⭐️ نتمنى لك تجربة ممتعة!`;

            await sock.sendMessage(chatId, {
                text: welcomeText
            }, { quoted: msg });
            return;
        }

        // Invalid command
        return await sock.sendMessage(chatId, {
            text: `❌ أمر غير صحيح!\n\n*استخدم:*\n• .autowelcome on\n• .autowelcome off\n• .autowelcome status`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in autowelcome command:', error);
    }
}

module.exports = autowelcomeCommand;
module.exports.loadAutoWelcomeState = loadAutoWelcomeState;
module.exports.saveAutoWelcomeState = saveAutoWelcomeState;
