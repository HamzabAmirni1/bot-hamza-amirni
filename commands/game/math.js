const settings = require('../../settings');

// Active sessions
const sessions = new Map();

async function mathCommand(sock, chatId, msg, args) {
    // If user is answering
    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);

        // Remove game if timeout passed (safety check)
        if (Date.now() - session.timestamp > 30000) {
            sessions.delete(chatId);
            return sock.sendMessage(chatId, { text: '⏰ *سالا الوقت!* اللعبة بدات من جديد.' }, { quoted: msg });
        }

        const userAnswer = parseInt(args[0]);
        if (isNaN(userAnswer)) return; // Ignore non-numbers

        if (userAnswer === session.answer) {
            const timeTaken = ((Date.now() - session.timestamp) / 1000).toFixed(1);
            await sock.sendMessage(chatId, { text: `✅ *برافو!* جواب صحيح: ${session.answer}\n⏱️ جاوبتي فـ ${timeTaken} ثانية.` }, { quoted: msg });
            sessions.delete(chatId);
        } else {
            await sock.sendMessage(chatId, { text: `❌ *غلط!* حاول مرة أخرى.` }, { quoted: msg });
        }
        return;
    }

    // New Game with difficulty levels
    // .math hard / .math medium / default easy

    // Simple generators
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];

    let a, b;
    if (op === '*') {
        a = Math.floor(Math.random() * 10) + 2;
        b = Math.floor(Math.random() * 10) + 2; // Keep multiplication simple 2-10
    } else {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
    }

    // Ensure positive result for subtraction if preferred (optional, but cleaner)
    if (op === '-' && a < b) {
        [a, b] = [b, a];
    }

    let answer;
    switch (op) {
        case '+': answer = a + b; break;
        case '-': answer = a - b; break;
        case '*': answer = a * b; break;
    }

    sessions.set(chatId, {
        answer: answer,
        timestamp: Date.now()
    });

    const question = `${a} ${op} ${b}`;

    let opSymbol = op;
    if (op === '*') opSymbol = '×';
    if (op === '-') opSymbol = '-'; // distinct dash

    const text = `🧮 *تحدي الحساب السريع*\n\nأحسب هادي:\n👉 *${a} ${opSymbol} ${b}* = ؟\n\nكتب الجواب ديريكت مور الكوموند (مثال: ${settings.prefix}math ${answer})\nعندك 30 ثانية! ⏳`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = mathCommand;
