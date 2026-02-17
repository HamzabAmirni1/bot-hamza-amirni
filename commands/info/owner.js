const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');
const { t } = require('../lib/language');

async function ownerCommand(sock, chatId, msg, args, commands, userLang) {
    const primaryOwner = Array.isArray(settings.ownerNumber) ? settings.ownerNumber[0] : settings.ownerNumber;

    const ownerInfo = `${t('owner_command.title', {}, userLang)}
    
╔════════════════════╗
  ${t('owner_command.dev_info_title', {}, userLang)}
╚════════════════════╝
▫️ *${t('owner_command.name', {}, userLang)}:* ${t('common.botOwner', {}, userLang)}
▫️ *${t('owner_command.role', {}, userLang)}:* ${t('owner_command.role_val', {}, userLang)}
▫️ *${t('owner_command.country', {}, userLang)}:* ${t('owner_command.country_val', {}, userLang)}
▫️ *${t('owner_command.status', {}, userLang)}:* ${t('owner_command.status_val', {}, userLang)}

🛠️ *${t('owner_command.services_title', {}, userLang)}*
━━━━━━━━━━━━━━━━━━━━
${t('owner_command.service1', {}, userLang)}
${t('owner_command.service2', {}, userLang)}
${t('owner_command.service3', {}, userLang)}
${t('owner_command.service4', {}, userLang)}

🚀 *${t('owner_command.projects_title', {}, userLang)}*
🌐 ${settings.portfolio}

╭━━━━━ 🔗 CONTACT CHANNELS ━━━━━╮

📸 *${t('owner_command.instagram', {}, userLang)}:*
  └ 1st: ${settings.instagram}
  └ 2nd: ${settings.instagram2}

👤 *${t('owner_command.facebook', {}, userLang)}:*
  └ Profile: ${settings.facebook}
  └ Page: ${settings.facebookPage}

✈️ *${t('owner_command.telegram', {}, userLang)}:* ${settings.telegram}
🎥 *${t('owner_command.youtube', {}, userLang)}:* ${settings.youtube}
👥 *${t('owner_command.wa_groups', {}, userLang)}:* ${settings.waGroups}
🔔 *${t('owner_command.official_channel', {}, userLang)}:* ${settings.officialChannel}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 ${t('owner_command.footer_motto', {}, userLang)}
💼 ${t('owner_command.powered_by', {}, userLang)}: ${settings.author}

*#${settings.botName.replace(/\s/g, '')} #WebDeveloper #Projects*`;

    // Send owner info message
    await sendWithChannelButton(sock, chatId, ownerInfo, msg, {}, userLang);

    // Send contact card
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${settings.botOwner}
ORG:${settings.botOwner} - Professional Developer
TEL;type=CELL;type=VOICE;waid=${primaryOwner}:+${primaryOwner}
item1.URL:${settings.portfolio}
item1.X-ABLabel:Portfolio
item2.URL:${settings.instagram}
item2.X-ABLabel:Instagram
item3.URL:${settings.youtube}
item3.X-ABLabel:YouTube
item4.URL:${settings.officialChannel}
item4.X-ABLabel:WhatsApp Channel
END:VCARD`;

    await sock.sendMessage(chatId, {
        contacts: {
            displayName: settings.botOwner,
            contacts: [{ vcard }]
        }
    });
}

module.exports = ownerCommand;
