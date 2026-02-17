const fs = require('fs');
const settings = require('../settings');

const words = [
    'المغرب', 'الدارالبيضاء', 'كسكسو', 'طاجين', 'اتاي', 'الرفيسة', 'البسطيلة',
    'الرجاء', 'الوداد', 'الجيش', 'فاس', 'مراكش', 'طنجة', 'شفشاون', 'اكادير',
    'المسيرة', 'الصحراء', 'اطلس', 'توبقال', 'زليج', 'قفطان', 'جلابة', 'بلغة',
    'مسمن', 'بغرير', 'حريرة', 'شباكية', 'سلو', 'عاشوراء', 'رمضان', 'العيد',
    'هامزا', 'بوت', 'واتساب', 'فيسبوك', 'انستغرام', 'تيكتوك', 'يوتيوب',
    'مدرسة', 'جامعة', 'استاد', 'تلميذ', 'القسم', 'السبورة', 'القلم',
    'الكرة', 'ملعب', 'هدف', 'حارس', 'مدرب', 'جمهور', 'تشجيع',
    'بحر', 'شاطئ', 'غابة', 'جبل', 'واد', 'صحراء', 'واحة', 'نخلة'
];

let hangmanGames = {};

function startHangman(sock, chatId) {
    if (hangmanGames[chatId]) {
        sock.sendMessage(chatId, { text: '❌ كاين ديجا طرح ملعوب! كملوه بعدا.' });
        return;
    }

    const word = words[Math.floor(Math.random() * words.length)];
    const maskedWord = '_ '.repeat(word.length).trim();

    hangmanGames[chatId] = {
        word,
        maskedWord: maskedWord.split(' '),
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 7,
    };

    sock.sendMessage(chatId, {
        text: `🎮 *لعبة المشنقة (Hangman) - النسخة المغربية* 🇲🇦\n\nالكلمة: \`${maskedWord}\`\n\n💡 *طريقة اللعب:*\nكتب غير *الحرف* ديريكت باش تخمن (بلا نقطة).\nمثال: \`ا\`\n\nعدد المحاولات: 7`
    });
}

function guessLetter(sock, chatId, letter) {
    if (!hangmanGames[chatId]) {
        sock.sendMessage(chatId, { text: '❌ ماكاين حتى طرح ملعوب دابا. كتب *.hangman* باش تبدا واحد جديد.' });
        return;
    }

    const game = hangmanGames[chatId];

    // Convert to lowercase if it's English, but here words are Arabic
    const guess = letter.trim();

    if (!guess) {
        sock.sendMessage(chatId, { text: '❌ عافاك كتب شي حرف باش تخمن!' });
        return;
    }

    // Handle full word guess
    if (guess.length > 1) {
        if (guess === game.word) {
            sock.sendMessage(chatId, { text: `🎉 مبروك! جبتيها لاصقة! الكلمة هي: *${game.word}* \nنتا ناضي! ⚔️` });
            delete hangmanGames[chatId];
        } else {
            game.wrongGuesses += 1;
            const remains = game.maxWrongGuesses - game.wrongGuesses;
            if (remains <= 0) {
                sock.sendMessage(chatId, { text: `💀 خسرتي! المشنقة كملات. الكلمة كانت هي: *${game.word}*` });
                delete hangmanGames[chatId];
            } else {
                sock.sendMessage(chatId, { text: `❌ لا ماشي هادي هي الكلمة! بقاو ليك ${remains} محاولات.` });
            }
        }
        return;
    }

    if (game.guessedLetters.includes(guess)) {
        sock.sendMessage(chatId, { text: `⚠️ ديجا قلتي هاد الحرف "${guess}". جرب حرف آخر.` });
        return;
    }

    game.guessedLetters.push(guess);

    if (game.word.includes(guess)) {
        for (let i = 0; i < game.word.length; i++) {
            if (game.word[i] === guess) {
                game.maskedWord[i] = guess;
            }
        }

        const currentMasked = game.maskedWord.join(' ');

        if (!game.maskedWord.includes('_')) {
            sock.sendMessage(chatId, { text: `🎉 مبروك! لقيتي الكلمة كاملة: *${game.word}* \nنتا ملك اللعبة! 👑` });
            delete hangmanGames[chatId];
        } else {
            sock.sendMessage(chatId, { text: `✅ صحيح! \n\n\`${currentMasked}\` \n\nالحروف لي جربتي: ${game.guessedLetters.join(', ')}` });
        }
    } else {
        game.wrongGuesses += 1;
        const remains = game.maxWrongGuesses - game.wrongGuesses;

        if (remains <= 0) {
            sock.sendMessage(chatId, { text: `💀 خسرتي! المشنقة كملات. الكلمة كانت هي: *${game.word}*` });
            delete hangmanGames[chatId];
        } else {
            sock.sendMessage(chatId, { text: `❌ حرف غلط! بقاو ليك ${remains} محاولات.\n\n\`${game.maskedWord.join(' ')}\`` });
        }
    }
}

async function handleHangmanMove(sock, chatId, senderId, text) {
    if (!hangmanGames[chatId]) return false;

    const game = hangmanGames[chatId];
    const cleanText = text.trim();

    if (cleanText.length === 0 || cleanText.startsWith(settings.prefix)) return false;

    // Surrender logic
    if (cleanText.toLowerCase() === 'انسحاب' || cleanText.toLowerCase() === 'surrender') {
        sock.sendMessage(chatId, { text: `🏳️ صافي، حبسنا اللعبة. الكلمة كانت هي: *${game.word}*` });
        delete hangmanGames[chatId];
        return true;
    }

    // Only intercept if it's a single letter or the exact length of the word (for word guess)
    if (cleanText.length === 1 || cleanText.length === game.word.length) {
        guessLetter(sock, chatId, cleanText);
        return true;
    }

    return false;
}

async function hangmanCommand(sock, chatId, msg, args) {
    if (args.length === 0) {
        return startHangman(sock, chatId);
    } else {
        return guessLetter(sock, chatId, args[0]);
    }
}

module.exports = {
    execute: hangmanCommand,
    handleMove: handleHangmanMove
};
