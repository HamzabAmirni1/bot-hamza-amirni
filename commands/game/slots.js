const { getUser, addCoins, removeCoins } = require('../../lib/leveling');
const settings = require('../../settings');

async function slotsCommand(sock, chatId, msg, args) {
    const userId = msg.key.participant || msg.participant;
    const user = getUser(userId);

    // Usage: .slots [bit]
    const bet = parseInt(args[0] || 50);

    if (isNaN(bet) || bet <= 0) {
        return sock.sendMessage(chatId, { text: `🎰 *Slots Machine* 🎰\n\nحط شحال باغي تلعب:\nمثال: ${settings.prefix}slots 100` }, { quoted: msg });
    }

    if (!removeCoins(userId, bet)) {
        return sock.sendMessage(chatId, { text: `❌ *والو!* ما عندكش ${bet} 🪙.\nرصيدك: ${user.coins} 🪙` }, { quoted: msg });
    }

    // Symbols
    const symbols = ['🍒', '🍋', '🍇', '🍉', '🔔', '💎', '7️⃣'];

    // Spin
    const s1 = symbols[Math.floor(Math.random() * symbols.length)];
    const s2 = symbols[Math.floor(Math.random() * symbols.length)];
    const s3 = symbols[Math.floor(Math.random() * symbols.length)];

    let winMultiplier = 0;

    // Winning Logic
    if (s1 === s2 && s2 === s3) {
        // Jackpot!
        if (s1 === '7️⃣') winMultiplier = 50; // 777
        else if (s1 === '💎') winMultiplier = 20; // Diamonds
        else winMultiplier = 10; // Regular fruits 3x
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        // Small win (2 pairs)
        winMultiplier = 2;
    }

    const winAmount = bet * winMultiplier;

    let resultText = '';
    if (winMultiplier > 0) {
        addCoins(userId, winAmount);
        resultText = `🎉 *ربحتي!* (+${winAmount} 🪙)`;
    } else {
        resultText = `📉 *خسرتي* (-${bet} 🪙)`;
    }

    const text = `
🎰 *SLOTS* 🎰

[ ${s1} | ${s2} | ${s3} ]

${resultText}
💰 *الجديد:* ${user.coins} 🪙
`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = slotsCommand;
