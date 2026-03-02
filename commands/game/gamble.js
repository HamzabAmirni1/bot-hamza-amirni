const { addCoins, removeCoins, getUser } = require('../../lib/leveling');
const settings = require('../../settings');

async function gambleCommand(sock, chatId, msg, args) {
    const userId = msg.key.participant || msg.participant;
    const user = getUser(userId);

    // .gamble [amount] [heads/tails or rouge/noir or just simple win/lose]
    // Simple version: .gamble 100

    if (!args[0]) {
        return sock.sendMessage(chatId, { text: `🎰 *Gamble* 🎰\n\nكيفاش تلعب:\n${settings.prefix}gamble [مبلغ]\nمثال: ${settings.prefix}gamble 100\n\n⚠️ إلا ربحتي الدوبل، وإلا خسرتي مشاو!` }, { quoted: msg });
    }

    let amount = 0;
    if (args[0] === 'all') {
        amount = user.coins;
    } else {
        amount = parseInt(args[0]);
    }

    if (isNaN(amount) || amount <= 0) {
        return sock.sendMessage(chatId, { text: `❌ *مبلغ ماشي هو هداك.*` }, { quoted: msg });
    }

    if (amount > user.coins) {
        return sock.sendMessage(chatId, { text: `❌ *ما عندكش هاد المبلغ!* عندك غير ${user.coins} 🪙.` }, { quoted: msg });
    }

    // 50/50 Chance (biased slightly to house? nah let's keep it fair for now)
    const win = Math.random() < 0.5;

    if (win) {
        addCoins(userId, amount);
        const newBalance = user.coins + amount; // user obj isn't auto updated in local var
        await sock.sendMessage(chatId, { text: `🎉 *ربحتي!* \n\n💰 *الربح:* +${amount} 🪙\n🤑 *المجموع:* ${newBalance} 🪙` }, { quoted: msg });
    } else {
        removeCoins(userId, amount);
        const newBalance = user.coins - amount;
        await sock.sendMessage(chatId, { text: `💸 *خسرتي!* \n\n🔻 *مشات:* -${amount} 🪙\n📉 *المجموع:* ${newBalance} 🪙\n\nغير زعم المرة الجاية! 😜` }, { quoted: msg });
    }
}

module.exports = gambleCommand;
