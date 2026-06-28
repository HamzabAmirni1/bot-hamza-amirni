const settings = require('../../settings');
const { t } = require('../../lib/language');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const botName = settings.botName || 'HAMZA AMIRNI';
        const prefix = settings.prefix || '.';
        const pushname = msg.pushName || 'User';
        const time = moment.tz(settings.timezone || 'Africa/Casablanca').format('HH:mm');
        const date = moment.tz(settings.timezone || 'Africa/Casablanca').format('DD/MM/YYYY');
        const uptime = runtime(process.uptime());

        const { getMenuCategories, arCmds, catIcons } = require('../../lib/menuCatalog');
        const catMap = getMenuCategories();

        const sectionTitles = {
            download:'📥 التحميلات',
            tools:   '🛠️ الأدوات',
            fun:     '🎭 الترفيه',
            games:   '🎮 الألعاب',
            group:   '👥 إدارة المجموعة',
            kora:    '⚽ كورة القدم',
            general: '✨ عام',
            owner:   '👑 المالك'
        };

        const thumbPath = path.join(process.cwd(), 'media/hamza.jpg');
        let thumbBuf = null;
        try { if (fs.existsSync(thumbPath)) thumbBuf = fs.readFileSync(thumbPath); } catch (_) {}

        async function getImageMsg(buf) {
            if (!buf) return null;
            try {
                const { imageMessage } = await generateWAMessageContent({ image: buf }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (_) { return null; }
        }

        const thumbMsg = await getImageMsg(thumbBuf);

        let cards = [];
        for (const [section, cmds] of Object.entries(catMap)) {
            if (!cmds || cmds.length === 0) continue;

            const title = sectionTitles[section] || section;

            // Build command list as rows of 3
            let bodyText = `✨ *${title}*\n\n`;
            for (let i = 0; i < cmds.length; i += 3) {
                const chunk = cmds.slice(i, i + 3);
                const row = chunk.map(cmd => {
                    const ar = arCmds[cmd];
                    return `▫️ *${prefix}${cmd}*` + (ar ? `  _(${ar})_` : '');
                }).join('\n');
                bodyText += row + '\n';
            }

            const headerObj = {
                title: title,
                hasMediaAttachment: !!thumbMsg
            };
            if (thumbMsg) headerObj.imageMessage = thumbMsg;

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `🤖 ${botName}` }),
                header: proto.Message.InteractiveMessage.Header.fromObject(headerObj),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({ display_text: '📢 القناة', url: settings.officialChannel || 'https://whatsapp.com' })
                        },
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({ display_text: '📸 Instagram', url: settings.instagram || 'https://instagram.com' })
                        },
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({ display_text: '👑 المطور', id: `${prefix}owner` })
                        }
                    ]
                })
            });
        }

        const introText =
            `👋 *أهلاً ${pushname}!*\n\n` +
            `🤖 *البوت:* ${botName}\n` +
            `👑 *المطور:* ${settings.botOwner || 'حمزة اعمرني'}\n` +
            `⏰ *الوقت:* ${time}\n` +
            `📅 *التاريخ:* ${date}\n` +
            `⏳ *وقت التشغيل:* ${uptime}\n\n` +
            `📌 *البادئة:* \`${prefix}\`\n` +
            `📦 *الأقسام:* ${Object.keys(catMap).length} قسم\n\n` +
            `👉 *مرر يميناً لاستعراض الأوامر* 👈`;

        const helpMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ text: introText }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName} 2026` }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, helpMsg.message, { messageId: helpMsg.key.id });

    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء تحميل القائمة.' }, { quoted: msg });
    }
};
