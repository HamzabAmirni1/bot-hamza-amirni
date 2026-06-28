const { sendWithChannelButton } = require('../../lib/channelButton');
const { channelInfo } = require('../../lib/messageConfig');
const fs = require('fs');
const path = require('path');
const { getAllUsers } = require('../../lib/userLogger');
const settings = require('../../settings');

async function devmsgCommand(sock, chatId, message, args) {
    try {
        const { isOwner, sendOwnerOnlyMessage } = require('../../lib/ownerCheck');

        // Owner-only command
        if (!isOwner(message)) {
            return await sendOwnerOnlyMessage(sock, chatId, message);
        }

        // Handle arguments
        let broadcastMsg = '';
        if (args && args.length > 0) {
            broadcastMsg = args.join(' ').trim();
        } else {
            // Fallback for direct message text extraction if args not passed
            const messageText = message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                message.message?.imageMessage?.caption ||
                message.message?.videoMessage?.caption || '';

            // Remove the command prefix and command name
            broadcastMsg = messageText.split(' ').slice(1).join(' ').trim();
        }

        if (!broadcastMsg) {
            const usage = `╔═══════════════════════════════════════╗
║    📢 أمر البث الجماعي للمستخدمين
╚═══════════════════════════════════════╝

📝 *الاستخدام:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${settings.prefix}devmsg [رسالتك هنا]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *أمثلة:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${settings.prefix}devmsg مرحباً! تم تحديث البوت 🎉
${settings.prefix}devmsg شكراً لاستخدامكم البوت ❤️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *ملاحظات:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▪️ يُرسل فقط لمن استخدم البوت سابقاً
▪️ نظام حماية من الحظر مفعّل

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍💻 ${settings.botName || 'Hamza Amirni'}`;

            return await sock.sendMessage(chatId, { text: usage, ...channelInfo }, { quoted: message });
        }

        // Collect unique users
        let allUsers = new Set();
        let sourceStats = { userLogger: 0, messageCount: 0 };

        // 1. From userLogger
        try {
            const usersData = getAllUsers();
            if (Array.isArray(usersData)) {
                usersData.forEach(u => {
                    if (u.id && u.id.includes('@s.whatsapp.net')) {
                        const cleanId = u.id.split(':')[0].split('@')[0] + '@s.whatsapp.net';
                        allUsers.add(cleanId);
                    }
                });
                sourceStats.userLogger = allUsers.size;
            }
        } catch (e) {
            console.error('[devmsg] Error reading users.json:', e);
        }

        // 2. From messageCount
        const messageCountFile = path.join(__dirname, '../data/messageCount.json');
        if (fs.existsSync(messageCountFile)) {
            try {
                const messageData = JSON.parse(fs.readFileSync(messageCountFile, 'utf8'));
                // Handle different possible structures of messageCount.json
                const mCounts = messageData.messageCount || messageData;
                Object.keys(mCounts).forEach(id => {
                    if (id.includes('@s.whatsapp.net') && !id.includes('@g.us')) {
                        const cleanId = id.split(':')[0].split('@')[0] + '@s.whatsapp.net';
                        if (!allUsers.has(cleanId)) {
                            allUsers.add(cleanId);
                            sourceStats.messageCount++;
                        }
                    }
                });
            } catch (e) {
                console.error('[devmsg] Error reading messageCount.json:', e);
            }
        }

        // 3. From premium.json
        const premiumFile = path.join(__dirname, '../data/premium.json');
        if (fs.existsSync(premiumFile)) {
            try {
                const premiumData = JSON.parse(fs.readFileSync(premiumFile, 'utf8'));
                if (Array.isArray(premiumData)) {
                    premiumData.forEach(id => {
                        const cleanId = id.toString().split('@')[0] + '@s.whatsapp.net';
                        allUsers.add(cleanId);
                    });
                }
            } catch (e) {
                console.error('[devmsg] Error reading premium.json:', e);
            }
        }

        // 4. From owner.json
        const ownerFile = path.join(__dirname, '../data/owner.json');
        if (fs.existsSync(ownerFile)) {
            try {
                const ownerData = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
                // Structure seems to be [[ "number" ]]
                const flatOwners = Array.isArray(ownerData) ? ownerData.flat(Infinity) : [];
                flatOwners.forEach(id => {
                    if (id) {
                        const cleanId = id.toString().split('@')[0] + '@s.whatsapp.net';
                        allUsers.add(cleanId);
                    }
                });
            } catch (e) {
                console.error('[devmsg] Error reading owner.json:', e);
            }
        }

        // 5. From globals (Real-time tracking of users this session)
        if (global.welcomedUsers instanceof Set) {
            global.welcomedUsers.forEach(jid => {
                if (jid && !jid.endsWith('@g.us')) {
                    const cleanId = jid.split(':')[0].split('@')[0] + '@' + (jid.split('@')[1] || 's.whatsapp.net');
                    allUsers.add(cleanId);
                }
            });
        }

        // Filter out the bot itself
        const users = Array.from(allUsers).filter(id => {
            if (!id) return false;
            const botId = sock.user?.id?.split(':')[0]?.split('@')[0];
            return !id.includes(botId);
        });

        console.log(`📊 DevMsg: Found ${users.length} unique users:`, users);

        if (users.length === 0) {
            const statsText = `❌ لم يتم العثور على مستخدمين.
            
📊 *إحصائيات البحث:*
- userLogger: ${sourceStats.userLogger}
- messageCount: ${sourceStats.messageCount}
- ملف users.json: ${fs.existsSync(path.join(__dirname, '../data/users.json')) ? 'موجود' : 'غير موجود'}
- ملف messageCount.json: ${fs.existsSync(path.join(__dirname, '../data/messageCount.json')) ? 'موجود' : 'غير موجود'}`;

            return await sock.sendMessage(chatId, { text: statsText }, { quoted: message });
        }

        // Send Status Initiation
        await sock.sendMessage(chatId, {
            text: `⏳ جاري بدء البث لـ *${users.length}* مستخدم...\nيرجى الانتظار، قد يستغرق الأمر بعض الوقت بسبب نظام الحماية.`,
            ...channelInfo
        }, { quoted: message });

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', timeZone: settings.timezone || 'Africa/Casablanca' });
        const dateStr = now.toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: settings.timezone || 'Africa/Casablanca' });

        const broadcastText =
`╔━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╗
┃       📣  رِسَـالَـةٌ مِـنَ الـمُـطَـوِّر       ┃
╚━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╝

${broadcastMsg}

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🕐 ${timeStr}  •  📅 ${dateStr}
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

👑 *${settings.botName || 'حمزة اعمرني'}*
╰┈➤ 📢 *القناة الرسمية:*
${settings.officialChannel || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _للأوامر اكتب_ *.help*
🔗 _إنستغرام:_ ${settings.instagram || ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        let success = 0;
        let fail = 0;

        // Load bot thumbnail for premium image+caption message
        const thumbPath = path.join(process.cwd(), 'media/hamza.jpg');
        const thumbBuf = fs.existsSync(thumbPath) ? fs.readFileSync(thumbPath) : null;

        for (const userId of users) {
            try {
                console.log(`[devmsg] Attempting to send to: ${userId}`);
                try {
                    if (thumbBuf) {
                        // Premium: send as image with caption
                        await sock.sendMessage(userId, {
                            image: thumbBuf,
                            caption: broadcastText,
                            ...channelInfo
                        });
                    } else {
                        await sock.sendMessage(userId, {
                            text: broadcastText,
                            ...channelInfo
                        });
                    }
                } catch (brandingError) {
                    console.error(`[devmsg] Branded message failed for ${userId}, trying simple text...`, brandingError.message);
                    await sock.sendMessage(userId, { text: broadcastText });
                }

                console.log(`[devmsg] Successfully sent to: ${userId}`);
                success++;

                // Anti-ban delay
                await new Promise(res => setTimeout(res, 2000 + Math.random() * 2000));
            } catch (err) {
                console.error(`[devmsg] Failed to send to ${userId}:`, err.message);
                fail++;
            }
        }

        // Final Report
        const report = `╔═══════════════════════════════════════╗
║    ✅ اكتمل البث الجماعي!
╚═══════════════════════════════════════╝

📊 *النتائج:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ نجح: ${success}
❌ فشل: ${fail}
👥 الإجمالي: ${users.length}

🛡️ تم استخدام نظام الحماية بنجاح.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍💻 ${settings.botName}`;

        await sock.sendMessage(chatId, { text: report, ...channelInfo }, { quoted: message });

    } catch (error) {
        console.error('Error in devmsg command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ غير متوقع أثناء البث.' });
    }
}

module.exports = devmsgCommand;
