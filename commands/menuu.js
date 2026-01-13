const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        const prefix = settings.prefix;
        const botName = settings.botName || 'حمزة اعمرني';

        // Runtime
        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);

        let thumbBuffer = null;
        try {
            let thumbPath = settings.botThumbnail;
            if (thumbPath && !path.isAbsolute(thumbPath)) {
                thumbPath = path.join(__dirname, '..', thumbPath);
            }
            if (thumbPath && fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            }
        } catch (e) { console.error('Error reading thumbnail:', e); }

        const date = new Date();
        const dateStr = date.toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });


        // 2. Define Category Mappings
        const catMap = {
            'new': ['qwen', 'edit', 'genai', 'banana-ai', 'ghibli', 'tomp3', 'resetlink', 'apk', 'apk2', 'apk3', 'hidetag', 'imdb', 'simp'],
            'deen': ['quran', 'salat', 'prayertimes', 'adhan', 'hadith', 'asmaa', 'azkar', 'qibla', 'ad3iya', 'dua', 'athan', 'tafsir', 'surah', 'ayah', 'fadlsalat', 'hukm', 'qiyam', 'danb', 'nasiha', 'tadabbur', 'sahaba', 'faida', 'hasanat', 'jumaa', 'hajj', 'sira', 'mawt', 'shirk', 'hub', 'deen'],
            'download': ['facebook', 'instagram', 'tiktok', 'youtube', 'mediafire', 'github', 'play', 'song', 'video', 'ytplay', 'yts', 'apk'],
            'ai': ['gpt4o', 'gpt4om', 'gpt4', 'gpt3', 'o1', 'gemini-analyze', 'qwen', 'gpt', 'gemini', 'deepseek', 'imagine', 'aiart', 'miramuse', 'ghibli-art', 'faceswap', 'ai-enhance', 'colorize', 'remini', 'vocalremover', 'musicgen', 'hdvideo', 'winkvideo', 'unblur', 'removebg', 'brat-vd'],
            'group': ['kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'close', 'open', 'delete', 'staff', 'groupinfo', 'welcome', 'goodbye', 'warn', 'warnings', 'antibadword', 'antilink'],
            'tools': ['sticker', 'sticker-alt', 'attp', 'ttp', 'ocr', 'tts', 'say', 'toimage', 'tovideo', 'togif', 'qrcode', 'ss', 'lyrics', 'calc', 'img-blur', 'translate', 'readviewonce', 'upload'],
            'news': ['news', 'akhbar', 'football', 'kora', 'weather', 'taqes'],
            'daily': ['daily', 'top', 'shop', 'gamble', 'slots', 'profile'],
            'fun': ['joke', 'fact', 'quote', 'meme', 'character', 'truth', 'dare', 'ship', 'ngl', '4kwallpaper'],
            'game': ['menugame', 'xo', 'rps', 'math', 'guess', 'scramble', 'riddle', 'quiz', 'love', 'hangman', 'trivia'],
            'economy': ['profile', 'daily', 'top', 'shop', 'gamble', 'slots'],
            'general': ['alive', 'ping', 'owner', 'script', 'setlang', 'system', 'help', 'allmenu'],
            'owner': ['mode', 'devmsg', 'autoreminder', 'pmblocker', 'backup', 'ban', 'unban', 'block', 'unblock', 'cleartmp', 'sudo', 'clear', 'clearsession', 'anticall']
        };

        const cmdIcons = {
            'genai': '🎨', 'edit': '�', 'banana-ai': '🍌', 'ghibli': '🎭', 'tomp3': '🎵', 'apk': '📱', 'apk2': '🚀', 'apk3': '🔥', 'simp': '💘',
            'quran': '📖', 'salat': '🕌', 'prayertimes': '🕋', 'adhan': '📢', 'hadith': '📚', 'asmaa': '✨', 'azkar': '📿', 'qibla': '🧭', 'ad3iya': '🤲', 'deen': '🕌',
            'facebook': '🔵', 'instagram': '�', 'tiktok': '🎵', 'youtube': '🎬', 'mediafire': '📂', 'play': '🎧', 'song': '🎶', 'video': '🎥',
            'gpt': '🤖', 'gemini': '♊', 'deepseek': '🧠', 'imagine': '🖼️', 'aiart': '🌟', 'ghibli-art': '🎨', 'remini': '✨', 'qwen': '🦄', 'gemini-analyze': '🔍',
            'kick': '�', 'promote': '🆙', 'demote': '⬇️', 'tagall': '📢', 'hidetag': '👻', 'mute': '🔇', 'unmute': '🔊', 'close': '🔒', 'open': '🔓',
            'sticker': '🖼️', 'translate': '🗣️', 'ocr': '🔍', 'qrcode': '🏁', 'weather': '🌦️', 'lyrics': '📜', 'calc': '🔢',
            'menugame': '🎮', 'quiz': '🧠', 'riddle': '🧩', 'joke': '🤣', 'meme': '🐸', 'truth': '💡', 'dare': '🔥',
            'profile': '�', 'daily': '💰', 'top': '🏆', 'shop': '🛒',
            'alive': '🟢', 'ping': '⚡', 'owner': '👑', 'help': '❓'
        };

        const requested = args[0] ? args[0].toLowerCase() : null;

        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        // ROOT FIX: Premium Text + Image Menu (100% Reliability)
        const sendMenu = async (text, headerTitle = "Hamza Amirni Bot") => {
            const footerBranding = `\n\n🛡️ *${botName.toUpperCase()}* 🛡️\n📢 *قناتنا:* ${settings.officialChannel}`;
            const fullText = text + footerBranding;

            if (thumbBuffer) {
                // Send standard Image Message (Most Reliable)
                // We REMOVE externalAdReply from image message to prevent conflicts
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
                            thumbnail: thumbBuffer, // If buffer exists but image send failed? just consistent logic
                            sourceUrl: settings.officialChannel,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: true
                        }
                    }
                }, { quoted: msg });
            }
        };

        // --- SUBMENU HANDLER ---
        if (requested) {
            // Check alias maps
            const categoryAliases = {
                'ai': 'ai', 'ذكاء': 'ai',
                'islam': 'deen', 'دين': 'deen', 'islamic': 'deen',
                'download': 'download', 'تحميل': 'download',
                'tools': 'tools', 'services': 'tools', 'أدوات': 'tools',
                'fun': 'fun', 'ضحك': 'fun', 'ترفيه': 'fun',
                'game': 'game', 'games': 'game', 'ألعاب': 'game',
                'news': 'news', 'أخبار': 'news',
                'owner': 'owner', 'مطور': 'owner',
                'group': 'group', 'مجموعات': 'group',
                'economy': 'economy', 'اقتصاد': 'economy', 'bank': 'economy'
            };

            let selectedKey = categoryAliases[requested] || (catMap[requested] ? requested : null);


            // Check if it's a specific command help request
            if (commands.has(requested) || (commands.has(requested) === false && requested)) {
                // Check aliases in handler if possible, but here we only have 'commands' map. 
                // We can roughly check if it's a command.
                if (commands.has(requested)) {
                    // It is a command
                    try {
                        // We don't have t() here easily unless we require it, but we can just say "No description"
                        // Or we can try to get it if the command exports a description (some do)
                        // But sticking to simple is better for now.
                        const cmd = commands.get(requested);
                        const desc = "أمر متاح"; // Placeholder since we don't have translation loaded here same way

                        await sendMenu(
                            `💡 *معلومات عن الأمر:* \`${prefix}${requested}\`\n\n` +
                            `📝 *الشرح:* استخدم هذا الأمر للاستفادة من خدمات البوت.\n\n` +
                            `👤 *المطور:* حمزة اعمرني`
                            , `معلومات ${requested}`);
                        return;
                    } catch (e) { }
                }
            }

            if (selectedKey && catMap[selectedKey]) {
                const header = `*┏━━❰ ⚔️ ${botName.toUpperCase()} ⚔️ ❱━━┓*\n`;
                let menuText = header + `\n✨ *قسم: ${selectedKey.toUpperCase()}* ✨\n` + `─━━━━━━━━━━━━━━─\n\n`;

                catMap[selectedKey].forEach(cmd => {
                    const icon = cmdIcons[cmd] || '🔹';
                    menuText += `${icon} *${prefix}${cmd}*\n`;
                });

                menuText += `\n─━━━━━━━━━━━━━━─\n` + `🔙 للرجوع: *.menu*`;
                return await sendMenu(menuText, `قسم ${selectedKey}`);
            }
        }

        // --- Execute Main Menu ---
        const bodyText =
            `*┏━━❰ ⚔️ ${botName.toUpperCase()} ⚔️ ❱━━┓*\n` +
            `┃ 🤵‍♂️ *المطور:* حمزة اعمرني\n` +
            `┃ 📅 *التاريخ:* ${dateStr}\n` +
            `┃ ⌚ *الوقت:* ${timeStr}\n` +
            `┃ ⏳ *النشاط:* ${days}d ${hours}h ${minutes}m\n` +
            `┃ 🤖 *الإصدار:* 2026.1.1\n` +
            `*┗━━━━━━━━━━━━━━━━━━━┛*\n\n` +
            `اختر القسم لي بغيتي من اللائحة:`;

        let mainMenu = bodyText + "\n\n" +
            `🚀 *${prefix}menu new* : الجديد (Hot)\n` +
            `🕌 *${prefix}menu deen* : الركن الإسلامي\n` +
            `🤖 *${prefix}menu ai* : الذكاء الاصطناعي\n` +
            `📥 *${prefix}menu download* : التحميلات\n` +
            `🛠️ *${prefix}menu tools* : الأدوات والخدمات\n` +
            `🤣 *${prefix}menu fun* : الترفيه والضحك\n` +
            `🎮 *${prefix}menu game* : قسم الألعاب\n` +
            `👥 *${prefix}menu group* : إدارة المجموعات\n` +
            `📰 *${prefix}menu news* : الأخبار والرياضة\n` +
            `💰 *${prefix}menu economy* : الاقتصاد (البنك)\n` +
            `⚙️ *${prefix}menu general* : نظام البوت\n` +
            `👑 *${prefix}menu owner* : قسم المطور\n` +
            `🌟 *${prefix}allmenu* : جميع الأوامر\n\n` +
            `💡 *نصيحة:* اكتب .menu متبوعاً باسم القسم (مثال: .menu ai)`;

        await sendMenu(mainMenu, `${botName} - القائمة الرئيسية`);

    } catch (error) {
        console.error('Error in menuu command:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء عرض القائمة.' });
    }
};
