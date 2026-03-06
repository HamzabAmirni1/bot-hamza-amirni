const { sendWithChannelButton } = require('../../lib/channelButton');
const fs = require('fs');
const path = require('path');
const { getAllUsers } = require('../../lib/userLogger');
const { isOwner } = require('../../lib/ownerCheck');

// Path to store auto reminder config
const REMINDER_CONFIG = path.join(__dirname, '../data/autoreminder.json');

// Default reminder message
const DEFAULT_MESSAGE = `╔═══════════════════════════════════════╗
║    🌟 رسالة من HAMZA AMIRNI BOT 🌟
╚═══════════════════════════════════════╝

السلام عليكم ورحمة الله وبركاته 🌙

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 *تابعنا للحصول على المزيد!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

نشارك يومياً:
✨ أدعية وأذكار
🎁 محتوى حصري ومفيد
📢 تحديثات البوت
🎬 فيديوهات تعليمية
💡 نصائح وإرشادات
🕌 أوقات الصلاة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *حساباتنا الرسمية:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 *Instagram* (تابعنا الآن!)
   • https://instagram.com/hamza_amirni_01
   • https://instagram.com/hamza_amirni_02

🎥 *YouTube* (اشترك في القناة!)
   • https://www.youtube.com/@Hamzaamirni01

📢 *قناة WhatsApp* (انضم الآن!)
   • https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p

💬 *واتساب مباشر:*
   • https://wa.me/212624855939

🌐 *الموقع الشخصي:*
   • https://hamzaamirni.netlify.app

 *TikTok:*
   • https://www.tiktok.com/@hamzaamirni

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 *لماذا تتابعنا؟*

✅ محتوى يومي مفيد
✅ دعم فني سريع
✅ تحديثات حصرية
✅ مسابقات وجوائز
✅ مجتمع نشط ومفيد

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ *HAMZA AMIRNI BOT*
شكراً لاستخدامك البوت! 💙

نتمنى لك يوماً سعيداً مليئاً بالخير 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *لا تنسى:* متابعة حساباتنا للبقاء على اطلاع!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// Load reminder config
function loadReminderConfig() {
    try {
        if (fs.existsSync(REMINDER_CONFIG)) {
            return JSON.parse(fs.readFileSync(REMINDER_CONFIG, 'utf8'));
        }
        // Default settings - enabled by default
        return {
            enabled: true,
            sendAtTime: '10:00',
            message: DEFAULT_MESSAGE,
            lastSent: null,
            totalSent: 0
        };
    } catch (error) {
        console.error('Error loading reminder config:', error);
        return {
            enabled: true,
            sendAtTime: '10:00',
            message: DEFAULT_MESSAGE,
            lastSent: null,
            totalSent: 0
        };
    }
}

// Save reminder config
function saveReminderConfig(config) {
    try {
        const dir = path.dirname(REMINDER_CONFIG);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(REMINDER_CONFIG, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving reminder config:', error);
        return false;
    }
}

// Command handler
async function autoreminderCommand(sock, chatId, message, args) {
    try {
        // Owner only
        if (!isOwner(message)) {
            return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر للمالك فقط!', message);
        }

        const command = args[0]?.toLowerCase();

        // Show help if no arguments
        if (!command) {
            const config = loadReminderConfig();
            return await sock.sendMessage(chatId, {
                text: `╔═══════════════════════════════════════╗
║    🔔 التذكير التلقائي للمستخدمين
╚═══════════════════════════════════════╝

📊 *الحالة الحالية:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔘 التفعيل: ${config.enabled ? '✅ مفعّل' : '❌ معطّل'}
⏰ وقت الإرسال: ${config.sendAtTime || '10:00'}
📨 آخر إرسال: ${config.lastSent ? new Date(config.lastSent).toLocaleString('ar') : 'لم يُرسل بعد'}
📊 إجمالي الإرسالات: ${config.totalSent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *الأوامر المتاحة:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ .autoreminder on
   └ تفعيل التذكير التلقائي

🚫 .autoreminder off
   └ تعطيل التذكير التلقائي

⏰ .autoreminder settime [الوقت]
   └ تحديد وقت الإرسال اليومي
   └ مثال: .autoreminder settime 10:00

📝 .autoreminder setmsg [رسالة]
   └ تخصيص رسالة التذكير

🔄 .autoreminder reset
   └ إعادة تعيين الرسالة للافتراضية

📊 .autoreminder status
   └ عرض الحالة التفصيلية

🚀 .autoreminder sendnow
   └ إرسال التذكير الآن (يدوياً)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *ملاحظات:*
▪️ الأمر مخصص للمالك فقط
▪️ يُرسل فقط لمن استخدم البوت
▪️ الوقت الافتراضي: 10:00 صباحاً
▪️ مفعّل تلقائياً عند بدء البوت

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        // Enable reminder
        if (command === 'on' || command === 'تفعيل') {
            const config = loadReminderConfig();
            config.enabled = true;
            saveReminderConfig(config);

            return await sock.sendMessage(chatId, {
                text: `✅ *تم تفعيل التذكير التلقائي!*

⏰ سيتم إرسال رسالة تذكير يومياً في ${config.sendAtTime}
👥 للمستخدمين الذين تفاعلوا مع البوت

💡 لتغيير الوقت: .autoreminder settime [الوقت]
📝 لتخصيص الرسالة: .autoreminder setmsg [رسالة]

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        // Disable reminder
        if (command === 'off' || command === 'تعطيل') {
            const config = loadReminderConfig();
            config.enabled = false;
            saveReminderConfig(config);

            return await sendWithChannelButton(sock, chatId, `❌ *تم تعطيل التذكير التلقائي!*

🔕 لن يتم إرسال رسائل تذكير تلقائية

💡 لإعادة التفعيل: .autoreminder on

⚔️ Hamza Amirni Bot`, message);
        }

        // Set time
        if (command === 'settime' || command === 'الوقت') {
            const time = args[1];

            const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!time || !timeRegex.test(time)) {
                return await sendWithChannelButton(sock, chatId, `❌ *وقت غير صحيح!*

📝 الاستخدام: .autoreminder settime [الوقت]

⏰ الصيغة: HH:MM (24 ساعة)

💡 أمثلة:
▪️ .autoreminder settime 10:00 (10 صباحاً)
▪️ .autoreminder settime 14:30 (2:30 مساءً)
▪️ .autoreminder settime 20:00 (8 مساءً)

⚔️ Hamza Amirni Bot`, message);
            }

            const config = loadReminderConfig();
            config.sendAtTime = time;
            saveReminderConfig(config);

            return await sock.sendMessage(chatId, {
                text: `✅ *تم تحديد وقت الإرسال!*

⏰ الوقت الجديد: ${time}

📅 سيتم إرسال التذكير يومياً في هذا الوقت

${config.enabled ? '✅ التذكير مفعّل' : '⚠️ التذكير معطّل حالياً'}

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        // Set custom message
        if (command === 'setmsg' || command === 'رسالة') {
            const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            const customMsg = fullText.replace(/^\.autoreminder\s+(setmsg|رسالة)\s+/i, '');

            if (!customMsg || customMsg.trim() === '' || customMsg === fullText) {
                return await sendWithChannelButton(sock, chatId, `❌ *الرجاء إدخال رسالة!*

📝 الاستخدام:
.autoreminder setmsg [رسالتك]

💡 مثال:
.autoreminder setmsg مرحباً! لا تنسى متابعة حساباتنا 📱

⚔️ Hamza Amirni Bot`, message);
            }

            const config = loadReminderConfig();
            config.message = customMsg.trim();
            saveReminderConfig(config);

            return await sock.sendMessage(chatId, {
                text: `✅ *تم تحديث رسالة التذكير!*

📝 الرسالة الجديدة:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${customMsg.trim().substring(0, 500)}${customMsg.length > 500 ? '...' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 لإعادة تعيين الرسالة الافتراضية: .autoreminder reset

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        // Reset to default message
        if (command === 'reset' || command === 'إعادة') {
            const config = loadReminderConfig();
            config.message = DEFAULT_MESSAGE;
            saveReminderConfig(config);

            return await sendWithChannelButton(sock, chatId, `✅ *تم إعادة تعيين الرسالة الافتراضية!*

📝 سيتم استخدام الرسالة الافتراضية التي تحتوي على جميع حساباتك

⚔️ Hamza Amirni Bot`, message);
        }

        // Status
        if (command === 'status' || command === 'حالة') {
            const config = loadReminderConfig();
            const users = getAllUsers();

            return await sock.sendMessage(chatId, {
                text: `╔═══════════════════════════════════════╗
║    📊 حالة التذكير التلقائي
╚═══════════════════════════════════════╝

🔘 *التفعيل:* ${config.enabled ? '✅ مفعّل' : '❌ معطّل'}
⏰ *وقت الإرسال:* ${config.sendAtTime || '10:00'} يومياً
👥 *عدد المستخدمين:* ${users.length}
📨 *آخر إرسال:* ${config.lastSent ? new Date(config.lastSent).toLocaleString('ar') : 'لم يُرسل بعد'}
📊 *إجمالي الإرسالات:* ${config.totalSent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *الرسالة الحالية:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${config.message.substring(0, 200)}${config.message.length > 200 ? '...' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        // Send now
        if (command === 'sendnow' || command === 'أرسل') {
            const config = loadReminderConfig();
            const users = getAllUsers().filter(u =>
                u.id.includes('@s.whatsapp.net') &&
                !u.id.includes('@g.us') &&
                !u.id.includes('@broadcast')
            );

            if (users.length === 0) {
                return await sendWithChannelButton(sock, chatId, `❌ لا يوجد مستخدمون لإرسال التذكير!

💡 انتظر حتى يتفاعل المستخدمون مع البوت

⚔️ Hamza Amirni Bot`, message);
            }

            await sock.sendMessage(chatId, {
                text: `⏳ *جاري إرسال التذكير...*

👥 عدد المستخدمين: ${users.length}

⚠️ قد يستغرق هذا بضع دقائق...`
            }, { quoted: message });

            let successCount = 0;
            let failCount = 0;

            for (const user of users) {
                try {
                    await sock.sendMessage(user.id, {
                        text: config.message
                    });
                    successCount++;

                    // Anti-ban delay
                    const delay = 2000 + Math.random() * 2000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } catch (error) {
                    console.error(`Failed to send reminder to ${user.id}:`, error);
                    failCount++;
                }
            }

            config.lastSent = new Date().toISOString();
            config.totalSent++;
            saveReminderConfig(config);

            return await sock.sendMessage(chatId, {
                text: `✅ *تم إرسال التذكير!*

📊 *النتائج:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ نجح: ${successCount}
❌ فشل: ${failCount}
👥 الإجمالي: ${users.length}
📈 نسبة النجاح: ${((successCount / users.length) * 100).toFixed(1)}%

⚔️ Hamza Amirni Bot`
            }, { quoted: message });
        }

        return await sendWithChannelButton(sock, chatId, `❌ أمر غير صحيح!

استخدم: .autoreminder (بدون معاملات) لعرض المساعدة

⚔️ Hamza Amirni Bot`, message);

    } catch (error) {
        console.error('Error in autoreminder command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ حدث خطأ: ${error.message}`
        }, { quoted: message });
    }
}

// Auto-send function
async function checkAndSendReminder(sock) {
    try {
        const config = loadReminderConfig();

        if (!config.enabled) {
            return;
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const targetTime = config.sendAtTime || '10:00';
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);

        const isTimeToSend = currentHour === targetHour && Math.abs(currentMinute - targetMinute) <= 5;

        if (!isTimeToSend) {
            return;
        }

        const lastSent = config.lastSent ? new Date(config.lastSent) : null;
        if (lastSent) {
            const lastSentDate = lastSent.toDateString();
            const todayDate = now.toDateString();

            if (lastSentDate === todayDate) {
                return;
            }
        }

        console.log(`🔔 Time to send auto reminder! (${currentTime})`);

        const users = getAllUsers().filter(u =>
            u.id.includes('@s.whatsapp.net') &&
            !u.id.includes('@g.us') &&
            !u.id.includes('@broadcast')
        );

        if (users.length === 0) {
            console.log('No users to send reminder to');
            return;
        }

        console.log(`Sending reminder to ${users.length} users...`);
        let successCount = 0;

        for (const user of users) {
            try {
                await sock.sendMessage(user.id, {
                    text: config.message
                });
                successCount++;

                const delay = 2000 + Math.random() * 2000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error(`Failed to send reminder to ${user.id}:`, error);
            }
        }

        config.lastSent = now.toISOString();
        config.totalSent++;
        saveReminderConfig(config);

        console.log(`✅ Reminder sent to ${successCount}/${users.length} users at ${currentTime}`);
    } catch (error) {
        console.error('Error in checkAndSendReminder:', error);
    }
}

module.exports = autoreminderCommand;
module.exports.checkAndSendReminder = checkAndSendReminder;
module.exports.loadReminderConfig = loadReminderConfig;
