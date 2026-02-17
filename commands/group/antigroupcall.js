const { enableAntiGroupCall, disableAntiGroupCall, isAntiGroupCallEnabled, getViolators } = require('../lib/antiGroupCall');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function antigroupcallCommand(sock, chatId, message, args) {
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
            const isEnabled = isAntiGroupCallEnabled(chatId);
            const violators = getViolators(chatId);

            let helpMsg = `📵 *نظام منع مكالمات المجموعة* 📵\n\n`;

            helpMsg += `📊 *الحالة الحالية:* ${isEnabled ? '✅ مفعل' : '🔕 معطل'}\n`;

            if (violators.length > 0) {
                helpMsg += `⚠️ *المخالفين:* ${violators.length} شخص\n`;
            }

            helpMsg += `\nالأوامر المتاحة:\n\n`;

            helpMsg += `1️⃣ *${settings.prefix}antigroupcall on*\n`;
            helpMsg += `   لتفعيل منع مكالمات المجموعة\n\n`;

            helpMsg += `2️⃣ *${settings.prefix}antigroupcall off*\n`;
            helpMsg += `   لإيقاف منع مكالمات المجموعة\n\n`;

            helpMsg += `3️⃣ *${settings.prefix}antigroupcall violators*\n`;
            helpMsg += `   لعرض قائمة المخالفين\n\n`;

            helpMsg += `📝 *كيف يعمل النظام؟*\n`;
            helpMsg += `• عند فتح مكالمة جماعية، يتم طرد الشخص تلقائياً\n`;
            helpMsg += `• المشرفون محميون من الطرد (يتلقون تحذير فقط)\n`;
            helpMsg += `• يتم حفظ قائمة المخالفين\n`;
            helpMsg += `• يجب أن يكون البوت مشرفاً في المجموعة\n\n`;

            helpMsg += `⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        const action = args[0].toLowerCase();

        // Enable anti-group-call
        if (action === 'on' || action === 'enable' || action === 'تفعيل') {
            const success = enableAntiGroupCall(chatId);

            if (success) {
                const msg = `✅ *تم تفعيل منع مكالمات المجموعة!*\n\n` +
                    `📵 *ماذا سيحدث؟*\n` +
                    `• أي شخص يفتح مكالمة جماعية سيتم طرده تلقائياً\n` +
                    `• المشرفون محميون (يتلقون تحذير فقط)\n` +
                    `• يتم حفظ قائمة المخالفين\n\n` +
                    `⚠️ *تأكد من:*\n` +
                    `• البوت مشرف في المجموعة\n` +
                    `• البوت لديه صلاحية طرد الأعضاء\n\n` +
                    `💡 لإيقاف النظام:\n${settings.prefix}antigroupcall off`;

                await sendWithChannelButton(sock, chatId, msg, message);
            } else {
                await sendWithChannelButton(sock, chatId, '❌ فشل تفعيل النظام. حاول مرة أخرى.', message);
            }
        }

        // Disable anti-group-call
        else if (action === 'off' || action === 'disable' || action === 'إيقاف') {
            const isEnabled = isAntiGroupCallEnabled(chatId);

            if (!isEnabled) {
                return await sendWithChannelButton(sock, chatId, '⚠️ النظام غير مفعل أصلاً!', message);
            }

            const success = disableAntiGroupCall(chatId);

            if (success) {
                const msg = `🔕 *تم إيقاف منع مكالمات المجموعة*\n\n` +
                    `📝 الآن يمكن لأي شخص فتح مكالمات جماعية.\n\n` +
                    `💡 لتفعيل النظام مرة أخرى:\n${settings.prefix}antigroupcall on`;

                await sendWithChannelButton(sock, chatId, msg, message);
            } else {
                await sendWithChannelButton(sock, chatId, '❌ فشل إيقاف النظام. حاول مرة أخرى.', message);
            }
        }

        // Show violators
        else if (action === 'violators' || action === 'list' || action === 'المخالفين') {
            const violators = getViolators(chatId);

            if (violators.length === 0) {
                return await sendWithChannelButton(sock, chatId,
                    `✅ *لا يوجد مخالفين حتى الآن!*\n\n` +
                    `📝 قائمة المخالفين فارغة.\n` +
                    `💡 سيتم إضافة أي شخص يفتح مكالمة جماعية.`,
                    message);
            }

            let msg = `⚠️ *قائمة المخالفين* (${violators.length})\n\n`;
            msg += `📵 الأشخاص الذين تم طردهم لفتح مكالمات:\n\n`;

            violators.forEach((violator, index) => {
                const number = violator.split('@')[0];
                msg += `${index + 1}. @${number}\n`;
            });

            msg += `\n💡 هؤلاء الأشخاص تم طردهم تلقائياً لفتح مكالمات جماعية.`;

            await sock.sendMessage(chatId, {
                text: msg,
                mentions: violators
            }, { quoted: message });
        }

        else {
            await sendWithChannelButton(sock, chatId,
                `❌ أمر غير معروف!\n\n💡 استخدم:\n${settings.prefix}antigroupcall\n\nلعرض جميع الأوامر المتاحة.`,
                message);
        }

    } catch (error) {
        console.error('Error in antigroupcall command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ: ${error.message}`, message);
    }
}

module.exports = antigroupcallCommand;
