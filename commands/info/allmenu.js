const settings = require('../../settings');
const { t } = require('../../lib/language');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const prefix = settings.prefix || '.';
        const botName = settings.botName || 'HAMZA AMIRNI';
        const time = moment.tz(settings.timezone || 'Africa/Casablanca').format('HH:mm');
        const date = moment.tz(settings.timezone || 'Africa/Casablanca').format('DD/MM/YYYY');
        const runtime = process.uptime();
        const d = Math.floor(runtime / 86400);
        const h = Math.floor((runtime % 86400) / 3600);
        const m = Math.floor((runtime % 3600) / 60);

        const { getMenuCategories, catIcons, arCmds } = require('../../lib/menuCatalog');
        const catMap = getMenuCategories();

        const sectionTitles = {
            download:'التحميلات',
            tools:   'الأدوات',
            fun:     'الترفيه',
            games:   'الألعاب',
            group:   'إدارة المجموعة',
            kora:    'كورة القدم',
            general: 'عام',
            owner:   'المالك'
        };

        const header =
            `╔══════════════════════╗\n` +
            `║   🤖 *${botName.toUpperCase()}*\n` +
            `╠══════════════════════╣\n` +
            `║ 👑 *المطور:* ${settings.botOwner || 'حمزة اعمرني'}\n` +
            `║ 📅 *التاريخ:* ${date}\n` +
            `║ ⏰ *الوقت:* ${time}\n` +
            `║ ⏳ *التشغيل:* ${d}ي ${h}س ${m}د\n` +
            `║ 📌 *البادئة:* ${prefix}\n` +
            `╚══════════════════════╝\n`;

        let menuText = header + '\n';

        for (const [key, cmds] of Object.entries(catMap)) {
            const icon = catIcons[key] || '🔹';
            const title = sectionTitles[key] || key;
            const total = cmds.length;

            menuText += `\n┌─ ${icon} *${title}* (${total}) ─┐\n`;
            cmds.forEach(cmd => {
                const ar = arCmds[cmd];
                const label = ar ? `${prefix}${cmd} _(${ar})_` : `${prefix}${cmd}`;
                menuText += `│ • ${label}\n`;
            });
            menuText += `└${'─'.repeat(22)}┘\n`;
        }

        const totalCmds = Object.values(catMap).reduce((acc, c) => acc + c.length, 0);
        menuText += `\n📊 *إجمالي الأوامر: ${totalCmds} أمر*\n`;
        menuText += `📢 *القناة:* ${settings.officialChannel || 'https://whatsapp.com'}\n`;
        menuText += `\n🏰 *${botName} — قوي دائماً* 🏰`;

        // Try to send with bot thumbnail
        let thumbBuffer = null;
        try {
            let thumbPath = settings.botThumbnail;
            if (thumbPath && !path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', '..', thumbPath);
            }
            if (thumbPath && fs.existsSync(thumbPath)) thumbBuffer = fs.readFileSync(thumbPath);
        } catch (_) {}

        if (thumbBuffer) {
            await sock.sendMessage(chatId, { image: thumbBuffer, caption: menuText }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: menuText }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in allmenu command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء تحميل القائمة.' }, { quoted: msg });
    }
};
