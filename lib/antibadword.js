const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// Load antibadword config
function loadAntibadwordConfig(groupId) {
    try {
        const configPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = JSON.parse(fs.readFileSync(configPath));
        return data.antibadword?.[groupId] || {};
    } catch (error) {
        console.error('❌ Error loading antibadword config:', error.message);
        return {};
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*ANTIBADWORD SETUP*\n\n*.antibadword on*\nTurn on antibadword\n\n*.antibadword set <action>*\nSet action: delete/kick/warn\n\n*.antibadword off*\nDisables antibadword in this group`
        });
    }

    if (match === 'on') {
        const existingConfig = await getAntiBadword(chatId, 'on');
        if (existingConfig?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword is already enabled for this group*' });
        }
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, { text: '*AntiBadword has been enabled. Use .antibadword set <action> to customize action*' });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword is already disabled for this group*' });
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '*AntiBadword has been disabled for this group*' });
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];
        if (!action || !['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, { text: '*Invalid action. Choose: delete, kick, or warn*' });
        }
        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, { text: `*AntiBadword action set to: ${action}*` });
    }

    return sock.sendMessage(chatId, { text: '*Invalid command. Use .antibadword to see usage*' });
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    const isGroup = chatId.endsWith('@g.us');

    // Skip if message is from bot or owner
    if (message.key.fromMe) return;
    const { isOwner } = require('./ownerCheck');
    if (isOwner(message)) return;

    // Load config for groups, or use default for private
    let antiBadwordConfig = { enabled: true, action: 'delete' }; // Default for private

    if (isGroup) {
        antiBadwordConfig = await getAntiBadword(chatId, 'on');
        if (!antiBadwordConfig?.enabled) return;
    } else {
        // For private, we dima (always) enable it as per user request "5aso dima ykon 5dam hta f private"
        // But we allow a way to disable if needed (optional later)
    }

    if (!antiBadwordConfig?.enabled) return;

    // Convert message to lowercase and clean it
    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Replace special chars with space
        .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
        .trim();

    // List of bad words
    const badWords = [
        'gandu', 'madarchod', 'bhosdike', 'bsdk', 'fucker', 'bhosda',
        'lauda', 'laude', 'betichod', 'chutiya', 'maa ki chut', 'behenchod',
        'behen ki chut', 'tatto ke saudagar', 'machar ki jhant', 'jhant ka baal',
        'randi', 'chuchi', 'boobs', 'boobies', 'tits', 'idiot', 'nigga', 'fuck',
        'dick', 'bitch', 'bastard', 'asshole', 'asu', 'awyu', 'teri ma ki chut',
        'teri maa ki', 'lund', 'lund ke baal', 'mc', 'lodu', 'benchod',

        // Additional offensive words
        'shit', 'damn', 'hell', 'piss', 'crap', 'bastard', 'slut', 'whore', 'prick',
        'motherfucker', 'cock', 'cunt', 'pussy', 'twat', 'wanker', 'douchebag', 'jackass',
        'moron', 'retard', 'scumbag', 'skank', 'slutty', 'arse', 'bugger', 'sod off',

        'chut', 'laude ka baal', 'madar', 'behen ke lode', 'chodne', 'sala kutta',
        'harami', 'randi ki aulad', 'gaand mara', 'chodu', 'lund le', 'gandu saala',
        'kameena', 'haramzada', 'chamiya', 'chodne wala', 'chudai', 'chutiye ke baap',

        // Moroccan Darija & Arabic Explicit/Sex-related words
        'tbon', 'tabon', 'tabonmk', 'tbina', 'zbi', 'zbbi', 'zb', 'nhwik', 'nhwikmk', 'nhwikomk', 'hwi', 'hwik', 'hwaya', 'mchiyik',
        'kahba', 'qahba', '9ahba', 'khba', 'khwiba', 'qlawi', '9lawi', 'qela', '9ela', 'qelwa', '9elwa', 'term', 'terma', 'tahna',
        'zamel', 'zml', '9wad', 'qwad', 'qwadmk', '9wadmk', 'mousikh', 'mousika', 'fessad', 'nik', 'nnik', 'nyk', 'mnyk', 'mnyka',
        'nikmk', 'nnikmk', 'mghabna', 'mghabna_mk', 'tahna', 'mfessad', 'mfessada',
        'khra', 'khara', 'kharamk', 'khrawi', 'mkhrow', 'mfessad', 'sharmouta', 'sharmout', 'sharmoota',
        'طبون', 'طيز', 'زب', 'زبي', 'نحويك', 'حوى', 'قحبة', 'كحبة', 'قلاوي', 'قلوة', 'ترمة', 'زمل', 'زامل', 'قواد', 'فاسد', 'فاسدة',
        'نيك', 'ننيك', 'منيك', 'منيكة', 'خرا', 'خراء', 'شرموطة', 'شرموط', 'لوطي', 'لواط', 'سكس', 'نيكاح', 'زنا', 'بزول', 'بزازل', 'مكوة',

        'fck', 'fckr', 'fcker', 'fuk', 'fukk', 'fcuk', 'btch', 'bch', 'bsdk', 'f*ck', 'assclown',
        'a**hole', 'f@ck', 'b!tch', 'd!ck', 'n!gga', 'f***er', 's***head', 'a$$', 'l0du', 'lund69',

        'spic', 'chink', 'cracker', 'towelhead', 'gook', 'kike', 'paki', 'honky',
        'wetback', 'raghead', 'jungle bunny', 'sand nigger', 'beaner',

        'blowjob', 'handjob', 'cum', 'cumshot', 'jizz', 'deepthroat', 'fap',
        'hentai', 'MILF', 'anal', 'orgasm', 'dildo', 'vibrator', 'gangbang',
        'threesome', 'porn', 'sex', 'xxx', 'xvideos', 'xnxx', 'pornhub', 'xhamster',
        'youporn', 'redtube', 'brazzers', 'eporner', 'hqporner', 'spankbang', 'beeg',
        'txxx', 'upornia', 'cam4', 'chaturbate', 'bongacams', 'stripchat', 'pornstars',
        'xhamster2', 'youjizz', 'drtuber', 'tnaflix', 'madthumbs', 'fapher', 'hentaigasm',

        'fag', 'faggot', 'dyke', 'tranny', 'homo', 'sissy', 'fairy', 'lesbo',

        'weed', 'pot', 'coke', 'heroin', 'meth', 'crack', 'dope', 'bong', 'kush',
        'hash', 'trip', 'rolling'
    ];

    // Split message into words
    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;

    // Check for exact word matches only
    for (const word of messageWords) {
        // Skip empty words or very short words
        if (word.length < 2) continue;

        // Check if this word exactly matches any bad word
        if (badWords.includes(word)) {
            containsBadWord = true;
            break;
        }

        // Also check for multi-word bad words
        for (const badWord of badWords) {
            if (badWord.includes(' ')) {  // Multi-word bad phrase
                if (cleanMessage.includes(badWord)) {
                    containsBadWord = true;
                    break;
                }
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    // --- DETECTED: TAKE ACTION ---

    if (isGroup) {
        // Check if bot is admin before taking action
        const groupMetadata = await sock.groupMetadata(chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const bot = groupMetadata.participants.find(p => p.id === botId);
        if (!bot?.admin) return;

        // Check if sender is admin
        const participant = groupMetadata.participants.find(p => p.id === senderId);
        if (participant?.admin) return;

        // Delete message
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch (err) {
            console.error('Error deleting message:', err);
        }

        // Action Logic for Groups
        switch (antiBadwordConfig.action) {
            case 'delete':
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} bad words are not allowed here*`,
                    mentions: [senderId]
                });
                break;
            case 'kick':
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await sock.sendMessage(chatId, {
                        text: `*@${senderId.split('@')[0]} has been kicked for using bad words*`,
                        mentions: [senderId]
                    });
                } catch (e) { }
                break;
            case 'warn':
                const warningCount = await incrementWarningCount(chatId, senderId);
                if (warningCount >= 3) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                        await resetWarningCount(chatId, senderId);
                        await sock.sendMessage(chatId, {
                            text: `*@${senderId.split('@')[0]} has been kicked after 3 warnings*`,
                            mentions: [senderId]
                        });
                    } catch (e) {
                        console.error('Error kicking user after warnings:', e);
                    }
                } else {
                    await sock.sendMessage(chatId, {
                        text: `*@${senderId.split('@')[0]} warning ${warningCount}/3 for using bad words*`,
                        mentions: [senderId]
                    });
                }
                break;
        }
    } else {
        // --- PRIVATE CHAT ACTION ---
        // We can't delete user's message in private, so we WARN then BLOCK
        const warningCount = await incrementWarningCount('PRIVATE', senderId);

        const userLang = getLanguage(senderId);

        if (warningCount >= 2) {
            await sock.sendMessage(chatId, {
                text: t('antibadword.block', {}, userLang)
            });
            await sock.updateBlockStatus(senderId, 'block');
            await resetWarningCount('PRIVATE', senderId);
        } else {
            await sock.sendMessage(chatId, {
                text: t('antibadword.warn', { count: warningCount + 1 }, userLang)
            });
        }
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
}; 