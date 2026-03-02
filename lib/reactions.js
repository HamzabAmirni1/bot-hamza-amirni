const fs = require('fs');
const path = require('path');
const { t } = require('./language');

// Path for storing auto-reaction state
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// List of emojis for command reactions
const commandEmojiMap = {
    // Media Commands
    '.play': '🎵',
    '.song': '🎶',
    '.video': '🎬',
    '.tiktok': '📹',
    '.instagram': '📸',
    '.facebook': '📱',
    '.youtube': '▶️',
    '.yts': '🔍',
    '.spotify': '🎧',

    // Download Commands
    '.apk': '📦',
    '.mediafire': '💾',
    '.url': '🔗',

    // Sticker Commands
    '.sticker': '🎨',
    '.stickercrop': '✂️',
    '.take': '🏷️',
    '.attp': '✍️',
    '.ttp': '📝',

    // AI Commands
    '.ai': '🤖',
    '.chatbot': '💬',
    '.imagine': '🎨',

    // Fun Commands
    '.meme': '😂',
    '.joke': '🤣',
    '.quote': '💭',
    '.fact': '💡',
    '.8ball': '🎱',
    '.compliment': '😊',
    '.insult': '😈',
    '.dare': '😱',
    '.truth': '🤔',
    '.hangman': '🎮',
    '.trivia': '❓',
    '.ship': '💕',

    // Group Commands
    '.tagall': '📢',
    '.hidetag': '👻',
    '.promote': '⬆️',
    '.demote': '⬇️',
    '.kick': '👢',
    '.ban': '🚫',
    '.unban': '✅',
    '.mute': '🔇',
    '.unmute': '🔊',
    '.antilink': '🔗',
    '.antitag': '🏷️',
    '.antibadword': '🤬',
    '.warn': '⚠️',
    '.welcome': '👋',
    '.goodbye': '👋',

    // Owner Commands
    '.mode': '⚙️',
    '.broadcast': '📣',
    '.block': '🚫',
    '.unblock': '✅',
    '.sudo': '👑',
    '.setpp': '🖼️',
    '.autostatus': '📊',
    '.autoreact': '⚡',
    '.autoread': '👁️',
    '.autotyping': '⌨️',

    // Info Commands
    '.menu': '📋',
    '.help': '❓',
    '.ping': '🏓',
    '.alive': '✅',
    '.botinfo': 'ℹ️',
    '.owner': '👨‍💻',
    '.script': '📜',
    '.features': '⭐',

    // Text/Image Commands
    '.metallic': '🔮',
    '.ice': '❄️',
    '.fire': '🔥',
    '.neon': '💡',
    '.blur': '🌫️',
    '.weather': '🌤️',
    '.news': '📰',
    '.translate': '🌍',
    '.ss': '📸',

    // Anime Commands
    '.anime': '🎭',
    '.character': '👤',

    // Other
    '.github': '🐙',
    '.lyrics': '🎤',
    '.emojimix': '🎨'
};

// Default emoji for unknown commands
const defaultCommandEmoji = '⏳';

// Emoji mapping based on keywords and patterns (for messages)
const emojiPatterns = {
    // Greetings & Hello
    greetings: {
        keywords: ['مرحبا', 'السلام', 'صباح', 'مساء', 'hello', 'hi', 'hey', 'good morning', 'good evening', 'سلام', 'اهلا', 'هلا', 'صباحو', 'مساؤك', 'السلام عليكم', 'وعليكم السلام'],
        emojis: ['👋', '🤝', '😊', '🌟', '✨']
    },
    // Love & Hearts
    love: {
        keywords: ['حب', 'احبك', 'love', '❤', '♥', 'قلب', 'عشق', 'غرام', 'حبيب', 'بحبك', 'احبه', 'i love', 'حبيبي', 'حبيبتي'],
        emojis: ['❤️', '💕', '💖', '😍', '💗', '💘']
    },
    // Happiness & Joy
    happy: {
        keywords: ['فرح', 'سعيد', 'happy', 'joy', 'haha', 'هههه', 'ههه', 'hhhh', 'xd', 'lol', '😂', '😄', 'مبسوط', 'مسرور', 'ضحك', 'يضحك'],
        emojis: ['😄', '😊', '🥳', '🎉', '✨', '🌟']
    },
    // Sadness
    sad: {
        keywords: ['حزين', 'زعلان', 'sad', 'cry', 'بكاء', 'دموع', 'مزعل', 'متضايق'],
        emojis: ['😢', '😭', '💔', '😔', '☹️']
    },
    // Thanks & Gratitude
    thanks: {
        keywords: ['شكرا', 'thanks', 'thank', 'جزاك', 'بارك', 'ممتن', 'مشكور', 'شكراً', 'تسلم', 'يعطيك العافية', 'الله يجزاك'],
        emojis: ['🙏', '🤝', '💚', '✨', '🌟']
    },
    // Food
    food: {
        keywords: ['طعام', 'اكل', 'جوعان', 'food', 'hungry', 'pizza', 'burger', 'طبخ', 'وجبة'],
        emojis: ['🍕', '🍔', '🍰', '🍱', '🥘', '😋']
    },
    // Sports
    sports: {
        keywords: ['رياضة', 'كورة', 'football', 'soccer', 'sport', 'فريق', 'لعب', 'مباراة'],
        emojis: ['⚽', '🏀', '🎮', '🏆', '💪']
    },
    // Music
    music: {
        keywords: ['موسيقى', 'اغنية', 'music', 'song', 'غناء', 'نشيد'],
        emojis: ['🎵', '🎶', '🎤', '🎸', '🎧']
    },
    // Sleep & Tired
    sleep: {
        keywords: ['نوم', 'نعسان', 'تعبان', 'sleep', 'tired', 'sleepy', 'متعب'],
        emojis: ['😴', '🥱', '💤', '🌙']
    },
    // Anger
    angry: {
        keywords: ['غضب', 'زعلان', 'angry', 'mad', 'upset', 'عصبي', 'متعصب'],
        emojis: ['😠', '😡', '💢', '🔥']
    },
    // Prayer & Religion
    prayer: {
        keywords: ['صلاة', 'دعاء', 'الله', 'prayer', 'pray', 'جامع', 'مسجد', 'رمضان', 'ان شاء الله', 'انشاءالله', 'ماشاء الله', 'الحمد لله', 'يارب', 'يا رب'],
        emojis: ['🤲', '☪️', '🕌', '📿', '✨']
    },
    // Study & Learning
    study: {
        keywords: ['دراسة', 'مذاكرة', 'study', 'learn', 'school', 'مدرسة', 'امتحان', 'كتاب'],
        emojis: ['📚', '✏️', '📖', '🎓', '💡']
    },
    // Party & Celebration
    party: {
        keywords: ['حفلة', 'عيد', 'party', 'celebration', 'احتفال', 'مناسبة'],
        emojis: ['🎉', '🎊', '🥳', '🎈', '🎁']
    },
    // Weather
    weather: {
        keywords: ['طقس', 'مطر', 'شمس', 'weather', 'rain', 'sun', 'حر', 'برد'],
        emojis: ['☀️', '🌧️', '⛈️', '🌈', '❄️']
    },
    // Work
    work: {
        keywords: ['عمل', 'شغل', 'work', 'job', 'وظيفة', 'مهمة'],
        emojis: ['💼', '👨‍💻', '💪', '📊', '⚡']
    },
    // Beautiful
    beautiful: {
        keywords: ['جميل', 'حلو', 'beautiful', 'nice', 'روعة', 'رائع', 'ممتاز'],
        emojis: ['😍', '🌟', '✨', '💯', '👌']
    },
    // Good luck
    luck: {
        keywords: ['حظ', 'توفيق', 'luck', 'بالتوفيق', 'نجاح'],
        emojis: ['🍀', '🌟', '✨', '💫', '🎯']
    },
    // Fire & Hot
    fire: {
        keywords: ['نار', 'fire', 'hot', 'حار', 'يشتعل'],
        emojis: ['🔥', '💥', '⚡', '💯']
    }
};

// Load auto-reaction state from file
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            return data.autoReaction !== undefined ? data.autoReaction : true;
        }
    } catch (error) {
        console.error('Error loading auto-reaction state:', error);
    }
    return true; // Default to true
}

// Save auto-reaction state to file
function saveAutoReactionState(state) {
    try {
        let data = {};
        if (fs.existsSync(USER_GROUP_DATA)) {
            data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
        }

        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto-reaction state:', error);
    }
}

// Store auto-reaction state
let isAutoReactionEnabled = loadAutoReactionState();

// Function to get emoji for a command
function getCommandEmoji(messageText) {
    if (!messageText) return defaultCommandEmoji;

    const lowerText = messageText.toLowerCase().trim();

    // Check if message starts with a command
    if (lowerText.startsWith('.')) {
        // Extract the command (first word)
        const command = lowerText.split(' ')[0];

        // Check if we have a specific emoji for this command
        if (commandEmojiMap[command]) {
            return commandEmojiMap[command];
        }
    }

    return defaultCommandEmoji;
}

// Function to detect emoji from message content (for non-commands)
function getSmartEmoji(messageText) {
    if (!messageText) return '👍';

    const lowerText = messageText.toLowerCase();

    // 1. Check if message already contains emoji - copy it
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojisInText = messageText.match(emojiRegex);
    if (emojisInText && emojisInText.length > 0) {
        return emojisInText[0]; // Return first emoji found
    }

    // 2. Check for questions
    if (lowerText.includes('?') || lowerText.includes('؟') ||
        lowerText.includes('كيف') || lowerText.includes('ليه') ||
        lowerText.includes('how') || lowerText.includes('why')) {
        return '🤔';
    }

    // 3. Check for exclamations
    if (lowerText.includes('!') || lowerText.includes('！')) {
        return '‼️';
    }

    // 4. Check message length
    if (messageText.length > 200) return '📝'; // Long message
    if (messageText.length < 5 && messageText.length > 0) return '👀'; // Very short message

    // 5. Check each pattern category
    const matches = [];
    for (const [category, pattern] of Object.entries(emojiPatterns)) {
        for (const keyword of pattern.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                matches.push({
                    emojis: pattern.emojis,
                    keywordLength: keyword.length
                });
            }
        }
    }

    // Return emoji from most specific match (longest keyword)
    if (matches.length > 0) {
        matches.sort((a, b) => b.keywordLength - a.keywordLength);
        const emojis = matches[0].emojis;
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    // 6. Default emoji
    return '👍';
}

// Function to add reaction to a message (both commands and regular messages)
async function addCommandReaction(sock, message) {
    try {
        if (!isAutoReactionEnabled || !message?.key?.id) return;

        // Extract message text from different message types
        let messageText = '';
        if (message.message?.conversation) {
            messageText = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            messageText = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage?.caption) {
            messageText = message.message.imageMessage.caption;
        } else if (message.message?.videoMessage?.caption) {
            messageText = message.message.videoMessage.caption;
        }

        // Get appropriate emoji based on message type
        let emoji;
        if (messageText.startsWith('.')) {
            // For commands, use specific command emoji
            emoji = getCommandEmoji(messageText);
        } else {
            // For regular messages, use smart emoji based on content
            emoji = getSmartEmoji(messageText);
        }

        // Add reaction asynchronously for speed
        sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        }).catch(() => { }); // Ignore errors
    } catch (error) {
        // Ignore errors
    }
}

// Function to handle areact command
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: t('reactions.owner_only'),
                quoted: message
            });
            return;
        }

        // Extract message text properly
        const messageText = message.message?.conversation ||
            message.message?.extendedTextMessage?.text || '';
        const args = messageText.split(' ');
        const action = args[1]?.toLowerCase();

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, {
                text: t('reactions.enabled'),
                quoted: message
            });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, {
                text: t('reactions.disabled'),
                quoted: message
            });
        } else {
            const status = isAutoReactionEnabled ? t('reactions.on') : t('reactions.off');
            await sock.sendMessage(chatId, {
                text: t('reactions.status', { status }),
                quoted: message
            });
        }
    } catch (error) {
        console.error('Error handling areact command:', error);
    }
}

module.exports = {
    addCommandReaction,
    handleAreactCommand
};