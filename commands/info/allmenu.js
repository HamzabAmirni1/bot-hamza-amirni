const settings = require('../../settings');
const { t } = require('../../lib/language');
const { sendWithChannelButton } = require('../../lib/channelButton');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const prefix = settings.prefix;

        // Runtime Stats
        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);

        let thumbBuffer = null;
        try {
            let thumbPath = settings.botThumbnail;
            if (!path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', thumbPath);
            }
            if (fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            }
        } catch (e) { console.error('Error reading thumbnail:', e); }

        const date = new Date();
        const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateString = date.toLocaleDateString('en-GB');

        const header =
            `┏━━━ ❰ *${t('common.botName', {}, userLang).toUpperCase()}* ❱ ━━━┓\n` +
            `┃ 🤵‍♂️ *${t('owner_command.name', {}, userLang)}:* ${t('common.botOwner', {}, userLang)}\n` +
            `┃ 📅 *${t('group.date', {}, userLang)}:* ${dateString}\n` +
            `┃ ⌚ *${t('menu.time', {}, userLang)}:* ${timeString}\n` +
            `┃ ⏳ *${t('menu.uptime', {}, userLang)}:* ${days}d ${hours}h ${minutes}m\n` +
            `┃ 🤖 *${t('menu.version', {}, userLang)}:* ${settings.version || '2.0.0'}\n` +
            `┗━━━━━━━━━━━━━━━━━━┛\n\n`;

        const { getMenuCategories } = require('../../lib/menuCatalog');
        const catMap = getMenuCategories();

        const cmdIcons = {
            'brat-vd': '🎬', 'hdvideo': '📀', 'winkvideo': '📹', 'musicgen': '🎵', 'removebg': '🖼️', 'unblur': '✨', 'upload': '📤', 'readviewonce': '👁️', 'pdf2img': '📄', 'stt': '🎙️',
            'genai': '🎨', 'edit': '🪄', 'nanobanana': '🍌', 'banana-ai': '🍌', 'ghibli': '🎭', 'tomp3': '🎵', 'apk': '📱', 'apk2': '🚀', 'simp': '💘',
            'quran': '📖', 'salat': '🕌', 'prayertimes': '🕋', 'adhan': '📢', 'hadith': '📚', 'asmaa': '✨', 'azkar': '📿', 'qibla': '🧭', 'ad3iya': '🤲', 'deen': '🕌',
            'jumaa': '📆', 'hajj': '🕋', 'sira': '🕊️', 'mawt': '⏳', 'shirk': '🛡️', 'hub': '💞', 'jannah': '🌴', 'nar': '🔥', 'qabr': '⚰️', 'qiyama': '🌋',
            'facebook': '🔵', 'instagram': '', 'tiktok': '🎵', 'youtube': '🎬', 'mediafire': '📂', 'play': '🎧', 'song': '🎶', 'video': '🎥',
            'gpt': '🤖', 'gemini': '♊', 'deepseek': '🧠', 'imagine': '🖼️', 'aiart': '🌟', 'ghibli-art': '🎨', 'remini': '✨',
            'kick': '', 'promote': '🆙', 'demote': '⬇️', 'tagall': '📢', 'hidetag': '👻', 'mute': '🔇', 'unmute': '🔊', 'close': '🔒', 'open': '🔓',
            'sticker': '🖼️', 'translate': '🗣️', 'ocr': '🔍', 'qrcode': '🏁', 'weather': '🌦️', 'lyrics': '📜', 'calc': '🔢',
            'game': '🎮', 'quiz': '🧠', 'riddle': '🧩', 'joke': '🤣', 'meme': '🐸', 'truth': '💡', 'dare': '🔥',
            'profile': '', 'daily': '💰', 'top': '🏆', 'shop': '🛒',
            'alive': '🟢', 'ping': '⚡', 'owner': '👑', 'help': '❓'
        };

        let menuText = header;

        for (const [key, cmds] of Object.entries(catMap)) {
            const title = t(`menu.categories.${key}`, {}, userLang);
            menuText += `\n┌─── ❰ ${title} ❱ ───┐\n`;

            cmds.forEach(c => {
                const icon = cmdIcons[c] || '🔹';
                const desc = t(`command_desc.${c}`, {}, userLang);
                const descText = desc.startsWith('command_desc.') ? '' : ` : ${desc}`;
                menuText += `│ ${icon} *${prefix}${c}*${descText}\n`;
            });
            menuText += `└──────────────────┘\n`;
        }

        menuText += `\n🏰 *Empire of Commands* 🏰`;

        const adReply = {
            title: `${t('common.botName', {}, userLang)} Menu`,
            body: t('common.channel', {}, userLang),
            sourceUrl: settings.officialChannel || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: true
        };

        if (thumbBuffer) {
            adReply.thumbnail = thumbBuffer;
        } else if (settings.botThumbnail && settings.botThumbnail.startsWith('http')) {
            adReply.thumbnailUrl = settings.botThumbnail;
        }

        // Add channel link to the bottom
        const fullText = menuText + `\n\n📢 *${t('common.channel', {}, userLang)}:*\n${settings.officialChannel}`;

        if (thumbBuffer) {
            // Send as image with caption
            await sock.sendMessage(chatId, {
                image: thumbBuffer,
                caption: fullText
            }, { quoted: msg });
        } else {
            // Fallback to text only
            await sock.sendMessage(chatId, {
                text: fullText
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in allmenu command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
};
