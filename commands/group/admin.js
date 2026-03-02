const { addAdmin, removeAdmin, getAdmins } = require('../../lib/botAdmins');
const { isOwner } = require('../../lib/ownerCheck');
const settings = require('../../settings');

module.exports = async (sock, chatId, msg, args) => {
    // Only owners can manage admins
    if (!isOwner(msg)) {
        return sock.sendMessage(chatId, { text: '❌ هذا الأمر مخصص للمالك فقط!' }, { quoted: msg });
    }

    const command = args[0]?.toLowerCase();

    if (command === 'add' || command === 'اضافة') {
        let target = '';
        let name = '';

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            name = args.slice(2).join(' ') || 'أدمن بوت';
        } else if (args[1]) {
            target = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            name = args.slice(2).join(' ') || 'أدمن بوت';
        }

        if (!target) return sock.sendMessage(chatId, { text: `❌ يرجى تحديد الشخص.\nمثال: ${settings.prefix}admin add @mention Hamza` }, { quoted: msg });
        
        const res = addAdmin(target, name);
        return sock.sendMessage(chatId, { text: res.message }, { quoted: msg });

    } else if (command === 'remove' || command === 'delete' || command === 'حذف') {
        let target = '';

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (args[1]) {
            target = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!target) return sock.sendMessage(chatId, { text: `❌ يرجى تحديد الشخص للحذف.` }, { quoted: msg });
        
        const res = removeAdmin(target);
        return sock.sendMessage(chatId, { text: res.message }, { quoted: msg });

    } else if (command === 'list' || command === 'قائمة' || !command) {
        const admins = getAdmins();
        if (admins.length === 0) return sock.sendMessage(chatId, { text: '📋 لا يوجد أدمن في القائمة حالياً.' }, { quoted: msg });

        let list = '👥 *قائمة أدمن البوت المعتمدين:*\n\n';
        admins.forEach((admin, i) => {
            list += `${i + 1}. 👤 *Name:* ${admin.name}\n`;
            list += `   📱 *Number:* ${admin.id.split('@')[0]}\n\n`;
        });
        
        list += `💡 هؤلاء الأشخاص يمكنهم استخدام البوت حتى لو كان مغلقاً.\n⚔️ ${settings.botName}`;
        return sock.sendMessage(chatId, { text: list }, { quoted: msg });
    }
};
