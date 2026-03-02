const { setGroupSchedule, removeGroupSchedule, getGroupSchedule, toggleGroupSchedule, loadSchedule } = require('../../lib/groupScheduler');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function scheduleCommand(sock, chatId, message, args) {
    try {
        // Only works in groups
        if (!chatId.endsWith('@g.us')) {
            return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر يعمل فقط في المجموعات!', message);
        }

        // Check if user is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const senderId = message.key.participant || message.key.remoteJid;
        const participant = groupMetadata.participants.find(p => p.id === senderId);

        if (!participant || (!participant.admin && !participant.superAdmin)) {
            return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر للمشرفين فقط!', message);
        }

        // Show help if no arguments
        if (!args || args.length === 0) {
            const currentSchedule = getGroupSchedule(chatId);
            let helpMsg = `⏰ *نظام جدولة المجموعة التلقائي* ⏰\n\n`;

            if (currentSchedule) {
                helpMsg += `📊 *الجدولة الحالية:*\n`;
                helpMsg += `🔓 وقت الفتح: ${currentSchedule.openTime}\n`;
                helpMsg += `🔒 وقت الإغلاق: ${currentSchedule.closeTime}\n`;
                helpMsg += `🔔 الحالة: ${currentSchedule.enabled ? 'مفعل ✅' : 'معطل 🔕'}\n\n`;
            } else {
                helpMsg += `📊 *الجدولة الحالية:* غير مفعلة\n\n`;
            }

            helpMsg += `الأوامر المتاحة:\n\n`;
            helpMsg += `1️⃣ *${settings.prefix}schedule set [وقت الفتح] [وقت الإغلاق]*\n`;
            helpMsg += `   لتفعيل الجدولة التلقائية\n`;
            helpMsg += `   مثال: ${settings.prefix}schedule set 08:00 22:00\n\n`;

            helpMsg += `2️⃣ *${settings.prefix}schedule off*\n`;
            helpMsg += `   لإيقاف الجدولة مؤقتاً\n\n`;

            helpMsg += `3️⃣ *${settings.prefix}schedule on*\n`;
            helpMsg += `   لتفعيل الجدولة مرة أخرى\n\n`;

            helpMsg += `4️⃣ *${settings.prefix}schedule remove*\n`;
            helpMsg += `   لحذف الجدولة نهائياً\n\n`;

            helpMsg += `5️⃣ *${settings.prefix}schedule list*\n`;
            helpMsg += `   لعرض جميع المجموعات المجدولة\n\n`;

            helpMsg += `📝 *ملاحظات:*\n`;
            helpMsg += `• استخدم صيغة 24 ساعة (مثال: 08:00, 22:00)\n`;
            helpMsg += `• سيتم فتح/إغلاق المجموعة تلقائياً\n`;
            helpMsg += `• سيتم تغيير اسم المجموعة (إضافة 🔓/🔒)\n`;
            helpMsg += `• سيتم إرسال رسالة عند كل فتح/إغلاق\n\n`;
            helpMsg += `⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        const action = args[0].toLowerCase();

        // Set schedule
        if (action === 'set') {
            if (args.length < 3) {
                return await sendWithChannelButton(sock, chatId,
                    `❌ يرجى تحديد وقت الفتح والإغلاق!\n\nمثال:\n${settings.prefix}schedule set 08:00 22:00\n\n📝 استخدم صيغة 24 ساعة (HH:MM)`,
                    message);
            }

            const openTime = args[1];
            const closeTime = args[2];

            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
                return await sendWithChannelButton(sock, chatId,
                    `❌ صيغة الوقت غير صحيحة!\n\n✅ الصيغة الصحيحة: HH:MM (24 ساعة)\n\nأمثلة صحيحة:\n• 08:00\n• 14:30\n• 22:00\n\nأمثلة خاطئة:\n• 25:00 (الساعة غير صحيحة)\n• 14:60 (الدقيقة غير صحيحة)`,
                    message);
            }

            // Normalize HH:MM (pad with zero if needed)
            const normalizeTime = (t) => {
                let [h, m] = t.split(':');
                return `${h.padStart(2, '0')}:${m}`;
            };
            const normalizedOpen = normalizeTime(openTime);
            const normalizedClose = normalizeTime(closeTime);

            // Set the schedule
            const success = setGroupSchedule(chatId, normalizedOpen, normalizedClose);

            if (success) {
                const successMsg = `✅ *تم تفعيل الجدولة التلقائية بنجاح!*\n\n`;
                const msg = successMsg +
                    `🔓 *وقت الفتح:* ${openTime}\n` +
                    `🔒 *وقت الإغلاق:* ${closeTime}\n\n` +
                    `📝 *ماذا سيحدث؟*\n` +
                    `• في ${openTime}: ستُفتح المجموعة تلقائياً 🔓\n` +
                    `• في ${closeTime}: ستُغلق المجموعة تلقائياً 🔒\n` +
                    `• سيتم تغيير اسم المجموعة\n` +
                    `• سيتم إرسال رسالة إعلامية\n\n` +
                    `⚙️ يمكنك إيقاف الجدولة مؤقتاً بـ:\n` +
                    `${settings.prefix}schedule off`;

                await sendWithChannelButton(sock, chatId, msg, message);
            } else {
                await sendWithChannelButton(sock, chatId, '❌ فشل حفظ الجدولة. حاول مرة أخرى.', message);
            }
        }

        // Turn off schedule
        else if (action === 'off') {
            const currentSchedule = getGroupSchedule(chatId);
            if (!currentSchedule) {
                return await sendWithChannelButton(sock, chatId, '❌ لا توجد جدولة مفعلة لهذه المجموعة!', message);
            }

            const success = toggleGroupSchedule(chatId, false);
            if (success) {
                await sendWithChannelButton(sock, chatId,
                    `🔕 *تم إيقاف الجدولة التلقائية*\n\n` +
                    `📊 الجدولة المحفوظة:\n` +
                    `🔓 وقت الفتح: ${currentSchedule.openTime}\n` +
                    `🔒 وقت الإغلاق: ${currentSchedule.closeTime}\n\n` +
                    `💡 لتفعيلها مرة أخرى:\n${settings.prefix}schedule on`,
                    message);
            }
        }

        // Turn on schedule
        else if (action === 'on') {
            const currentSchedule = getGroupSchedule(chatId);
            if (!currentSchedule) {
                return await sendWithChannelButton(sock, chatId,
                    `❌ لا توجد جدولة محفوظة!\n\n💡 أنشئ جدولة جديدة:\n${settings.prefix}schedule set 08:00 22:00`,
                    message);
            }

            const success = toggleGroupSchedule(chatId, true);
            if (success) {
                await sendWithChannelButton(sock, chatId,
                    `🔔 *تم تفعيل الجدولة التلقائية*\n\n` +
                    `🔓 وقت الفتح: ${currentSchedule.openTime}\n` +
                    `🔒 وقت الإغلاق: ${currentSchedule.closeTime}\n\n` +
                    `✅ ستعمل الجدولة بدءاً من الآن!`,
                    message);
            }
        }

        // Remove schedule
        else if (action === 'remove' || action === 'delete') {
            const currentSchedule = getGroupSchedule(chatId);
            if (!currentSchedule) {
                return await sendWithChannelButton(sock, chatId, '❌ لا توجد جدولة مفعلة لهذه المجموعة!', message);
            }

            const success = removeGroupSchedule(chatId);
            if (success) {
                await sendWithChannelButton(sock, chatId,
                    `🗑️ *تم حذف الجدولة نهائياً*\n\n` +
                    `💡 لإنشاء جدولة جديدة:\n${settings.prefix}schedule set 08:00 22:00`,
                    message);
            }
        }

        // List all schedules (owner only)
        else if (action === 'list') {
            const { isOwner } = require('../../lib/ownerCheck');
            if (!isOwner(message)) {
                return await sendWithChannelButton(sock, chatId, '❌ هذا الأمر للمالك فقط!', message);
            }

            const allSchedules = loadSchedule();
            const scheduleCount = Object.keys(allSchedules).length;

            if (scheduleCount === 0) {
                return await sendWithChannelButton(sock, chatId, '📊 لا توجد مجموعات مجدولة حالياً.', message);
            }

            let listMsg = `📊 *المجموعات المجدولة* (${scheduleCount})\n\n`;

            let index = 1;
            for (const [groupId, config] of Object.entries(allSchedules)) {
                try {
                    const groupMeta = await sock.groupMetadata(groupId).catch(() => null);
                    const groupName = groupMeta ? groupMeta.subject : 'Unknown Group';

                    listMsg += `${index}. *${groupName}*\n`;
                    listMsg += `   🔓 ${config.openTime} | 🔒 ${config.closeTime}\n`;
                    listMsg += `   ${config.enabled ? '✅ مفعل' : '🔕 معطل'}\n\n`;
                    index++;
                } catch (e) {
                    console.error('Error fetching group metadata:', e);
                }
            }

            listMsg += `⚔️ ${settings.botName}`;
            await sendWithChannelButton(sock, chatId, listMsg, message);
        }

        else {
            await sendWithChannelButton(sock, chatId,
                `❌ أمر غير معروف!\n\n💡 استخدم:\n${settings.prefix}schedule\n\nلعرض جميع الأوامر المتاحة.`,
                message);
        }

    } catch (error) {
        console.error('Error in schedule command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ: ${error.message}`, message);
    }
}

module.exports = scheduleCommand;
