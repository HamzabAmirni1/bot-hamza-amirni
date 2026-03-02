const { getUser, addCoins, removeCoins } = require('../../lib/leveling');
const settings = require('../../settings');

// Deck helper
const suits = ['♠️', '♥️', '♣️', '♦️'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getDeck() {
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
    // Shuffle
    return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function getHandValue(hand) {
    let value = 0;
    let aces = 0;
    for (let card of hand) {
        value += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

const sessions = new Map();

async function bjCommand(sock, chatId, msg, args) {
    const userId = msg.key.participant || msg.participant;
    const user = getUser(userId);

    // Stop current game
    if (args[0] === 'stop' || args[0] === 'end') {
        if (sessions.has(chatId)) {
            sessions.delete(chatId);
            return sock.sendMessage(chatId, { text: '🛑 اللعبة تحبسـات.' }, { quoted: msg });
        }
        return;
    }

    // Existing Game Actions
    if (sessions.has(chatId)) {
        const session = sessions.get(chatId);
        if (session.player !== userId) return; // Only player who started can play

        const action = args[0]?.toLowerCase();

        if (action === 'hit' || action === 'zid') {
            const card = session.deck.pop();
            session.playerHand.push(card);
            const pVal = getHandValue(session.playerHand);

            if (pVal > 21) {
                // Bust
                let text = `🃏 *Blackjack* 🃏\n\n`;
                text += `👤 *نتا:* ${session.playerHand.map(c => c.value + c.suit).join(' ')} (= ${pVal})\n`;
                text += `🤖 *انا:* ${session.dealerHand.map(c => c.value + c.suit).join(' ')}\n\n`;
                text += `💥 *Bust!* فتّي 21. خسرتي ${session.bet} 🪙.`;
                sessions.delete(chatId);
                return sock.sendMessage(chatId, { text }, { quoted: msg });
            } else if (pVal === 21) {
                // Auto Stand logic could go here, but let's ask user to stand
            }

            // Show Status
            let text = `🃏 *Blackjack* 🃏\n\n`;
            text += `👤 *نتا:* ${session.playerHand.map(c => c.value + c.suit).join(' ')} (= ${pVal})\n`;
            text += `🤖 *انا:* ${session.dealerHand[0].value + session.dealerHand[0].suit} [?]\n\n`;
            text += `كتب *${settings.prefix}bj hit* (نزيد) ولا *${settings.prefix}bj stand* (باراكا).`;
            return sock.sendMessage(chatId, { text }, { quoted: msg });

        } else if (action === 'stand' || action === 'baraka') {
            // Dealer Turn
            let dVal = getHandValue(session.dealerHand);
            while (dVal < 17) {
                session.dealerHand.push(session.deck.pop());
                dVal = getHandValue(session.dealerHand);
            }

            const pVal = getHandValue(session.playerHand);

            let result = '';
            let winAmount = 0;

            if (dVal > 21 || pVal > dVal) {
                result = '🎉 *ربحتي!*';
                winAmount = session.bet * 2;
                addCoins(userId, winAmount); // Refund bet + win (bet was already removed? no, removed at start) -> actually need to add 2x bet.
                // Wait, logic: remove N at start. If win, give back 2N. Net gain N.
            } else if (dVal === pVal) {
                result = '🤝 *تعادل!*';
                winAmount = session.bet;
                addCoins(userId, winAmount); // Refund bet
            } else {
                result = '💸 *خسرتي!*';
                // No refund
            }

            let text = `🃏 *Blackjack - النتيجة* 🃏\n\n`;
            text += `👤 *نتا:* ${session.playerHand.map(c => c.value + c.suit).join(' ')} (= ${pVal})\n`;
            text += `🤖 *انا:* ${session.dealerHand.map(c => c.value + c.suit).join(' ')} (= ${dVal})\n\n`;
            text += `${result}\n💰 الجديد: ${user.coins} 🪙`;

            sessions.delete(chatId);
            return sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    }

    // New Game
    const bet = parseInt(args[0] || 50);
    if (isNaN(bet) || bet <= 0) return sock.sendMessage(chatId, { text: `🎰 *Blackjack*\nحط شحال تلعب: ${settings.prefix}bj 100` }, { quoted: msg });

    if (!removeCoins(userId, bet)) {
        return sock.sendMessage(chatId, { text: `❌ *والو!* ما عندكش ${bet} 🪙.` }, { quoted: msg });
    }

    const deck = getDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    sessions.set(chatId, {
        player: userId,
        deck,
        playerHand,
        dealerHand,
        bet
    });

    const pVal = getHandValue(playerHand);

    // Check instant Blackjack (21)
    if (pVal === 21) {
        addCoins(userId, bet * 2.5); // Blackjack payout 3:2 usually, let's do 2.5x total (1.5x profit)
        sessions.delete(chatId);
        return sock.sendMessage(chatId, { text: `🃏 *BLACKJACK!* 🎉\nجبتي 21 من الضربة لولى!\nربحتي ${bet * 1.5} 🪙.` }, { quoted: msg });
    }

    let text = `🃏 *Blackjack* 🃏\n\n`;
    text += `👤 *نتا:* ${playerHand.map(c => c.value + c.suit).join(' ')} (= ${pVal})\n`;
    text += `🤖 *انا:* ${dealerHand[0].value + dealerHand[0].suit} [?]\n\n`;
    text += `كتب *${settings.prefix}bj hit* (نزيد) ولا *${settings.prefix}bj stand* (باراكا).`;

    await sock.sendMessage(chatId, { text }, { quoted: msg });
}

module.exports = bjCommand;
