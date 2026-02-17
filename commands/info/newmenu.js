const { t } = require('../lib/language');
const settings = require('../settings');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const langMap = {
            'en': 'English',
            'ar': 'العربية',
            'ma': 'الدارجة'
        };
        const langName = langMap[userLang] || userLang || 'Multi';

        // 1. Define the "New" commands manually to ensure this menu is curated
        const newCommands = [
            'genai', 'edit', 'banana-ai', 'ghibli',
            'tomp3', 'resetlink', 'hidetag',
            'imdb', 'simp', 'apk', 'apk2'
        ];

        // 2. Build the Menu Text
        let menuText = `╭━━━〘 🔥 *NEW FEATURES* 🔥 〙━━━╮\n`;
        menuText += `┃ 👤 *Dev:* ${t('common.botOwner', {}, userLang)}\n`;
        menuText += `┃ 🌐 *Lang:* ${langName}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `✨ *Discover the latest tools added to ${t('common.botName', {}, userLang)}:*\n\n`;

        newCommands.forEach(cmd => {
            const desc = t(`command_desc.${cmd}`, {}, userLang);
            // If description starts with command_desc., it's missing, so hide it or show empty
            const descText = desc.startsWith('command_desc.') ? '' : desc;

            menuText += `🆕 *${settings.prefix}${cmd}*\n`;
            if (descText) menuText += `   └ _${descText}_\n`;
            menuText += `\n`;
        });

        menuText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `💡 *Type ${settings.prefix}help [command] for more info.*\n`;
        menuText += `©️ *${t('common.botName', {}, userLang)} | 2025*`;

        // 3. Send with Image
        await sock.sendMessage(chatId, {
            image: { url: settings.botThumbnail },
            caption: menuText
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in newmenu command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
};
