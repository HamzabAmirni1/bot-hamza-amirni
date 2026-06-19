const { t } = require('../../lib/language');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');

function runtime(seconds, lang = 'ar') {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);

    if (lang === 'en') {
        var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return dDisplay + hDisplay + mDisplay + sDisplay;
    } else {
        var dDisplay = d > 0 ? d + (d == 1 ? " يوم و " : " أيام و ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " ساعة و " : " ساعات و ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " دقيقة و " : " دقائق و ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " ثانية" : " ثواني") : "";
        return dDisplay + hDisplay + mDisplay + sDisplay;
    }
}

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const botName = settings.botName || 'HAMZA AMIRNI';
        const forcedLang = 'ar'; // Force Arabic for .menuu
        const isArabic = true;
        const prefix = settings.prefix;

        const { getMenuuCategories, arCmds: menuArCmds } = require('../../lib/menuCatalog');
        const catMap = getMenuuCategories();
        const arCmds = {
            ...menuArCmds,
            edit: 'تعديل',
            imdb: 'فيلم',
            autogroup: 'أوتو-قروب'
        };

        const catIcons = {
            'new': '🔥', 'religion': '🕌', 'download': '📥', 'ai': '🤖', 'group': '👥', 'tools': '🛠️',
            'fun_games': '🎮', 'economy_news': '💰', 'general_owner': '👑'
        };

        const catImages = {
            'new': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'religion': path.join(process.cwd(), 'media/menu/menu_light_2.png'),
            'ai': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'download': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'group': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'tools': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'fun_games': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'economy_news': path.join(process.cwd(), 'media/menu/menu_light_1.png'),
            'general_owner': path.join(process.cwd(), 'media/menu/menu_light_1.png')
        };

        const sections = ['new', 'religion', 'ai', 'download', 'group', 'tools', 'fun_games', 'economy_news', 'general_owner'];

        async function createHeaderImage(imagePath) {
            try {
                const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(imagePath) }, { upload: sock.waUploadToServer });
                return imageMessage;
            } catch (e) {
                console.error(`Failed to load image: ${imagePath}. Error: ${e.message}`);
                const fallbackPath = path.join(process.cwd(), 'media/hamza.jpg');
                try {
                    const { imageMessage } = await generateWAMessageContent({ image: fs.readFileSync(fallbackPath) }, { upload: sock.waUploadToServer });
                    return imageMessage;
                } catch (err) {
                    return null;
                }
            }
        }

        let cards = [];
        for (let section of sections) {
            const title = t(`menu.categories.${section}`, {}, forcedLang);
            const cmds = catMap[section];
            const icon = catIcons[section] || '🔹';
            const imageUrl = catImages[section] || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop';

            let bodyText = `✨ *${icon} قسم ${title}* ✨\n\n`;
            let rows = [];
            for (let i = 0; i < cmds.length; i += 3) {
                const chunk = cmds.slice(i, i + 3);
                const rowStr = chunk.map(cmd => {
                    const displayName = (isArabic && arCmds[cmd]) ? arCmds[cmd] : cmd;
                    return `▫️ *${prefix}${displayName}*`;
                }).join('   ');
                rows.push(rowStr);
            }
            bodyText += rows.join('\n');

            const imageMessage = await createHeaderImage(imageUrl);
            const headerObj = {
                title: `قائمة ${title}`,
                hasMediaAttachment: !!imageMessage
            };
            if (imageMessage) {
                headerObj.imageMessage = imageMessage;
            }

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
                header: proto.Message.InteractiveMessage.Header.fromObject(headerObj),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "قناتي الرسمية 🔔", url: settings.officialChannel })
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "أنستغرام 📸", url: settings.instagram })
                        },
                        {
                            "name": "cta_url",
                            "buttonParamsJson": JSON.stringify({ display_text: "فيسبوك 📘", url: settings.facebookPage })
                        },
                        {
                            "name": "quick_reply",
                            "buttonParamsJson": JSON.stringify({ display_text: "المطور 👑", id: ".owner" })
                        }
                    ]
                })
            });
        }

        const time = moment.tz(settings.timezone || 'Africa/Casablanca').format('HH:mm:ss');
        const date = moment.tz(settings.timezone || 'Africa/Casablanca').format('DD/MM/YYYY');
        const uptime = runtime(process.uptime(), userLang);
        const pushname = msg.pushName || (userLang === 'en' ? 'User' : 'مستخدم');

        // Translation Labels
        const L_WELCOME = t('menu.welcome', {}, userLang);
        const L_BOTNAME = t('menu.bot_name', {}, userLang);
        const L_DEV = t('menu.developer', {}, userLang);
        const L_TIME = t('menu.time', {}, userLang);
        const L_UPTIME = t('menu.uptime', {}, userLang);
        const L_SWIPE = t('menu.swipe', {}, userLang);

        const menuMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `👋 *${L_WELCOME} ${pushname}*\n\n` +
                                `🤖 *${L_BOTNAME}:* ${userLang === 'en' ? 'Hamza Amirni' : 'حمزة اعمرني'}\n` +
                                `👑 *${L_DEV}:* حمزة اعمرني\n` +
                                `⏰ *${L_TIME}:* ${time}\n` +
                                `📅 *التاريخ:* ${date}\n` +
                                `⏳ *${L_UPTIME}:* ${uptime}\n\n` +
                                `🔗 *حساباتي:*\n` +
                                `📸 *أنستغرام:* ${settings.instagram}\n` +
                                `📘 *فيسبوك:* ${settings.facebookPage}\n` +
                                `👑 *المطور:* wa.me/${settings.ownerNumber[0]}\n\n` +
                                `*${L_SWIPE}*`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `🤖 ${botName}` }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, menuMsg.message, { messageId: menuMsg.key.id });

    } catch (error) {
        console.error('Error in menuu command:', error);
        await sock.sendMessage(chatId, { text: t('common.error', {}, userLang) });
    }
};
