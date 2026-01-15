const settings = require('../settings');
const { t } = require('../lib/language');
const { sendWithChannelButton } = require('../lib/channelButton');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    console.log(`[Help] 📥 Request for help from ${chatId}`);
    try {
        const commandList = Array.from(commands.keys()).sort();
        const prefix = settings.prefix;

        const requested = args[0] ? args[0].toLowerCase() : null;
        const islamicAliases = ['islam', 'islamic', 'deen', 'دين', 'ديني', 'اسلاميات', 'islam', 'religion'];
        const gameAliases = ['games', 'game', 'العاب', 'لعب', 'منيو_لعب', 'menugame'];
        const funAliases = ['fun', 'dahik', 'ضحك', 'ترفيه', 'نكت'];
        const downloadAliases = ['download', 'tahmilat', 'tahmil', 'تحميل', 'تيليشارجي'];
        const toolsAliases = ['tools', 'adawat', 'أدوات', 'وسائل', 'خدمات'];
        const ownerAliases = ['owner', 'molchi', 'mol-chi', 'المالك', 'المطور'];
        const generalAliases = ['general', '3am', 'عام', 'نظام', 'سيستم'];
        const allAliases = ['all', 'allmenu', 'listall', 'كامل', 'كلشي'];
        const aiAliases = ['ai', 'ذكاء', 'ذكاء_اصطناعي', 'robot', 'bot'];

        // 2. Define Category Mappings
        const catMap = {
            'new': ['qwen', 'edit', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
            'religion': ['quran', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen'],
            'download': ['facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'github', 'play', 'song', 'video', 'ytplay', 'yts'],
            'ai': ['gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'brat-vd'],
            'group': ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink'],
            'tools': ['pdf2img', 'stt', 'sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'lyrics', 'calc', 'img-blur', 'translate', 'readviewonce', 'upload'],
            'news': ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes'],
            'fun': ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper'],
            'games': ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia'],
            'economy': ['profile', 'daily', 'top', 'shop', 'gamble', 'slots'],
            'general': ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu'],
            'owner': ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall']
        };

        const cmdIcons = {
            'genai': '🎨', 'edit': '🪄', 'banana-ai': '🍌', 'ghibli': '🎭', 'tomp3': '🎵', 'apk': '📱', 'apk2': '🚀', 'apk3': '🔥', 'simp': '💘',
            'quran': '📖', 'salat': '🕌', 'prayertimes': '🕋', 'adhan': '📢', 'hadith': '📚', 'asmaa': '✨', 'azkar': '📿', 'qibla': '🧭', 'ad3iya': '🤲', 'deen': '🕌',
            'jumaa': '📆', 'hajj': '🕋', 'sira': '🕊️', 'mawt': '⏳', 'shirk': '🛡️', 'hub': '💞', 'jannah': '🌴', 'nar': '🔥', 'qabr': '⚰️', 'qiyama': '🌋',
            'facebook': '🔵', 'instagram': '📸', 'tiktok': '🎵', 'youtube': '🎬', 'mediafire': '📂', 'play': '🎧', 'song': '🎶', 'video': '🎥',
            'gpt': '🤖', 'gemini': '♊', 'deepseek': '🧠', 'imagine': '🖼️', 'aiart': '🌟', 'ghibli-art': '🎨', 'remini': '✨', 'qwen': '🦄', 'gemini-analyze': '🔍',
            'kick': '🚫', 'promote': '🆙', 'demote': '⬇️', 'tagall': '📢', 'hidetag': '👻', 'mute': '🔇', 'unmute': '🔊', 'close': '🔒', 'open': '🔓',
            'sticker': '🖼️', 'translate': '🗣️', 'ocr': '🔍', 'qrcode': '🏁', 'weather': '🌦️', 'lyrics': '📜', 'calc': '🔢',
            'game': '🎮', 'quiz': '🧠', 'riddle': '🧩', 'joke': '🤣', 'meme': '🐸', 'truth': '💡', 'dare': '🔥',
            'profile': '👤', 'daily': '💰', 'top': '🏆', 'shop': '🛒',
            'alive': '🟢', 'ping': '⚡', 'owner': '👑', 'help': '❓',
            'brat-vd': '🎬', 'hdvideo': '📀', 'winkvideo': '📹', 'musicgen': '🎵', 'removebg': '🖼️', 'unblur': '✨', 'upload': '📤', 'readviewonce': '👁️', 'pdf2img': '📄', 'stt': '🎙️'
        };

        // 3. Runtime Stats & Thumbnail
        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);

        let thumbBuffer = null;
        try {
            // Try to resolve the path relative to the root or absolute
            let thumbPath = settings.botThumbnail;
            if (!path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', thumbPath);
            }
            if (fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            }
        } catch (e) { console.error('Error reading thumbnail:', e); }

        // Pretty Date Time
        const date = new Date();
        const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateString = date.toLocaleDateString('en-GB');

        const header =
            `┏━━━ ❰ *${t('common.botName', {}, userLang).toUpperCase()}* ❱ ━━━┓\n` +
            `┃ 🤵‍♂️ *Owner:* ${t('common.botOwner', {}, userLang)}\n` +
            `┃ 📆 *Date:* ${dateString}\n` +
            `┃ ⌚ *Time:* ${timeString}\n` +
            `┃ ⏳ *Uptime:* ${days}d ${hours}h ${minutes}m\n` +
            `┃ 🤖 *Ver:* ${settings.version || '2.0.0'}\n` +
            `┗━━━━━━━━━━━━━━━━━━┛\n\n`;

        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        const sendMenu = async (text, headerTitle = "Hamza Amirni Bot") => {
            const footerBranding = `\n\n🛡️ *${t('common.botName', {}, userLang)}* 🛡️\n📢 *قناتنا:* ${settings.officialChannel}`;
            const fullText = text + footerBranding;

            if (thumbBuffer) {
                // Send standard Image Message (Most Reliable)
                // REMOVE externalAdReply from image message to prevent conflicts
                await sock.sendMessage(chatId, {
                    image: thumbBuffer,
                    caption: fullText,
                    contextInfo: {
                        mentionedJid: [chatId],
                        isForwarded: true,
                        forwardingScore: 999
                    }
                }, { quoted: msg });
            } else {
                // Text Fallback with Link Preview
                await sock.sendMessage(chatId, {
                    text: fullText,
                    contextInfo: {
                        mentionedJid: [chatId],
                        isForwarded: true,
                        forwardingScore: 999,
                        externalAdReply: {
                            title: headerTitle,
                            body: "المطور: حمزة اعمرني",
                            thumbnail: thumbBuffer,
                            sourceUrl: settings.officialChannel,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: true
                        }
                    }
                }, { quoted: msg });
            }
        };

        // --- PRIORITY 1: Sub-Menu/Category Aliases ---
        if (requested) {
            // Global Redirect for .menu all
            if (allAliases.includes(requested)) {
                const allmenu = require('./allmenu');
                return await allmenu(sock, chatId, msg, args, commands, userLang);
            }

            let selectedKey = null;
            if (catMap[requested]) selectedKey = requested;
            else if (funAliases.includes(requested)) selectedKey = 'fun';
            else if (downloadAliases.includes(requested)) selectedKey = 'download';
            else if (toolsAliases.includes(requested)) selectedKey = 'tools';
            else if (ownerAliases.includes(requested)) selectedKey = 'owner';
            else if (generalAliases.includes(requested)) selectedKey = 'general';
            else if (aiAliases.includes(requested)) selectedKey = 'ai';
            else if (islamicAliases.includes(requested)) selectedKey = 'religion';
            else if (gameAliases.includes(requested)) selectedKey = 'games';

            if (selectedKey) {
                const catName = t(`menu.categories.${selectedKey}`, {}, userLang);
                let menuText = header + `\n✨ *أوامر قسم: ${catName.toUpperCase()}* ✨\n` + `─━━━━━━━━━━━━━━─\n\n`;

                catMap[selectedKey].forEach(c => {
                    const icon = cmdIcons[c] || '🔹';
                    const desc = t(`command_desc.${c}`, {}, userLang);
                    const descText = desc.startsWith('command_desc.') ? '' : `\n   └ _${desc}_`;
                    menuText += `${icon} *${prefix}${c}*${descText}\n\n`;
                });

                menuText += `─━━━━━━━━━━━━━━─\n` + `🔙 اكتب *.menu* للرجوع للقائمة الرئيسية.`;
                return await sendMenu(menuText, `أوامر ${catName}`);
            }

            // Command Help Info
            if (commands.has(requested)) {
                const desc = t(`command_desc.${requested}`, {}, userLang);
                return await sendMenu(
                    `💡 *معلومات عن الأمر:* \`${prefix}${requested}\`\n\n` +
                    `📝 *الشرح:* ${desc.startsWith('command_desc.') ? 'لا يوجد وصف حالياً' : desc}\n\n` +
                    `👤 *المطور:* حمزة اعمرني`
                );
            }
        }

        // --- PRIORITY 2: Main Menu Display ---
        let mainMenu = header +
            `🏰 *مرحباً بك في إمبراطورية الأوامر* 🏰\n` +
            `بوت شامل ومتطور لخدمتك. تفضل باختيار القسم:\n\n` +
            `🚀 *${prefix}menu new* : الجديد (Hot)\n` +
            `🕌 *${prefix}menu deen* : الركن الإسلامي\n` +
            `🤖 *${prefix}menu ai* : الذكاء الاصطناعي\n` +
            `📥 *${prefix}menu download* : التحميلات\n` +
            `🛠️ *${prefix}menu tools* : الأدوات والخدمات\n` +
            `🤣 *${prefix}menu fun* : الترفيه والضحك\n` +
            `🎮 *${prefix}menu games* : قسم الألعاب\n` +
            `👥 *${prefix}menu group* : إدارة المجموعات\n` +
            `📰 *${prefix}menu news* : الأخبار والرياضة\n` +
            `💰 *${prefix}menu economy* : الاقتصاد (البنك)\n` +
            `⚙️ *${prefix}menu general* : نظام البوت\n` +
            `👑 *${prefix}menu owner* : قسم المطور\n` +
            `🌟 *${prefix}allmenu* : جميع الأوامر\n\n` +
            `💡 *نصيحة:* اكتب .menu متبوعاً باسم القسم (مثال: .menu ai)`;

        await sendMenu(mainMenu, "Hamza Amirni Bot Menu");

    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: t('common.error') }, { quoted: msg });
    }
};
