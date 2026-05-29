let handler = m => m;

handler.before = async function (m, { conn, isOwner }) {
    if (!m.isGroup && !isOwner) {
        const ownerNumber = "212717457920@s.whatsapp.net"; // رقم المالك
        const userNumber = m.sender.split('@')[0];
        const groupId = "120363352960551073@g.us"; // ID المجموعة

        try {
            // 1. حظر المستخدم
            await conn.updateBlockStatus(m.sender, "block");

            // 2. إرسال تنبيه الحظر للمالك
            await conn.sendMessage(ownerNumber, {
                text: `⚠️ تم حظر مستخدم من الخاص:\nالرقم: ${userNumber}`
            }).catch(e => console.error('فشل في إرسال تنبيه الحظر:', e));

            // 3. انتظار 4 ثوانٍ قبل المحاولة طرده
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 4. محاولة الحصول على بيانات المجموعة
            const groupData = await conn.groupMetadata(groupId).catch(e => null);

            if (groupData) {
                const isParticipant = groupData.participants.some(p => p.id === m.sender);

                if (isParticipant) {
                    await conn.groupParticipantsUpdate(
                        groupId,
                        [m.sender],
                        "remove"
                    ).catch(e => console.error('فشل في طرد المستخدم:', e));

                    await conn.sendMessage(ownerNumber, {
                        text: `🚫 تم طرد ${userNumber} من المجموعة`
                    }).catch(e => console.error('فشل في إرسال تنبيه الطرد:', e));
                }
            }
        } catch (error) {
            console.error('حدث خطأ أثناء التنفيذ:', error);
        }
    }
    return true;
};

module.exports = handler;
