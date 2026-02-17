const { t } = require('../lib/language');

async function groupInfoCommand(sock, chatId, msg) {
    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);

        // Get group profile picture
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            pp = 'https://i.imgur.com/2wzGhpF.jpeg'; // Default image
        }

        // Get admins from participants
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');

        // Get group owner
        const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || chatId.split('-')[0] + '@s.whatsapp.net';

        // Create info text
        const text = `
${t('group.info_title')}
${t('group.info_id')}
   • ${groupMetadata.id}
${t('group.info_name')} 
• ${groupMetadata.subject}
${t('group.info_members')}
• ${participants.length}
${t('group.info_owner')}
• @${owner.split('@')[0]}
${t('group.info_admins')}
${listAdmin}

${t('group.info_desc')}
   • ${groupMetadata.desc?.toString() || t('group.info_no_desc')}
`.trim();

        // Send the message with image and mentions
        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions: [...groupAdmins.map(v => v.id), owner]
        });

    } catch (error) {
        console.error('Error in groupinfo command:', error);
        await sock.sendMessage(chatId, { text: t('group.info_error') });
    }
}

module.exports = groupInfoCommand; 
