const isAdmin = async (sock, chatId, senderId) => {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Normalize JID by removing device ID and converting to base format
        const normalizeJid = (jid) => {
            if (!jid) return '';
            // Remove device ID (e.g., :18)
            const base = jid.split(':')[0];
            // Get just the number part
            const number = base.split('@')[0];
            return number;
        };

        const senderNumber = normalizeJid(senderId);
        const botNumber = normalizeJid(botId);

        const participant = groupMetadata.participants.find(p => {
            const pNumber = normalizeJid(p.id);
            return pNumber === senderNumber;
        });

        const bot = groupMetadata.participants.find(p => {
            const pNumber = normalizeJid(p.id);
            return pNumber === botNumber;
        });

        const isBotAdmin = bot && (bot.admin === 'admin' || bot.admin === 'superadmin');
        const isSenderAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');

        return {
            isSenderAdmin: !!isSenderAdmin,
            isBotAdmin: !!isBotAdmin
        };
    } catch (error) {
        console.error('Error in isAdmin:', error);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
};

module.exports = isAdmin;
