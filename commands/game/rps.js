const settings = require('../../settings');

async function rpsCommand(sock, chatId, msg, args) {
    const userChoice = args[0]?.toLowerCase();

    // Map inputs to standard choices
    const map = {
        'hjar': 'rock', 'hjra': 'rock', 'rock': 'rock', 'pierre': 'rock', 'حجرة': 'rock', 'حجره': 'rock', '🪨': 'rock', '✊': 'rock',
        'wr9a': 'paper', 'warqa': 'paper', 'paper': 'paper', 'feuille': 'paper', 'ورقة': 'paper', 'ورقه': 'paper', '📄': 'paper', '✋': 'paper',
        'm9as': 'scissors', 'mqas': 'scissors', 'scissors': 'scissors', 'ciseaux': 'scissors', 'مقص': 'scissors', '✂️': 'scissors', '✌️': 'scissors'
    };

    if (!userChoice || !map[userChoice]) {
        const text = `🎮 *لعبة حجرة ورقة مقص* 🎮\n\nاختار باش تلعب:\n✊ *${settings.prefix}rps حجرة*\n✋ *${settings.prefix}rps ورقة*\n✌️ *${settings.prefix}rps مقص*\n\nتحدى البوت وشوف شكون يربح! 🤖`;
        return sock.sendMessage(chatId, { text: text }, { quoted: msg });
    }

    const player = map[userChoice];
    const choices = ['rock', 'paper', 'scissors'];
    const bot = choices[Math.floor(Math.random() * choices.length)];

    // Emojis for display
    const emojis = { 'rock': '✊', 'paper': '✋', 'scissors': '✌️' };
    const names = { 'rock': 'حجرة', 'paper': 'ورقة', 'scissors': 'مقص' };

    let result = '';

    if (player === bot) {
        result = '🤝 *تعادل!* بجوجنا بحال بحال.';
    } else if (
        (player === 'rock' && bot === 'scissors') ||
        (player === 'paper' && bot === 'rock') ||
        (player === 'scissors' && bot === 'paper')
    ) {
        result = '🎉 *ربحتي!* نتا واعر معلم. 💪';
    } else {
        result = '🤖 *أنا ربحت!* حظ أوفر المرة الجاية. 😜';
    }

    const response = `
🎮 *النتيجة:*

👤 *نتا:* ${emojis[player]} (${names[player]})
🤖 *أنا:* ${emojis[bot]} (${names[bot]})

${result}
    `;

    await sock.sendMessage(chatId, { text: response }, { quoted: msg });
}

module.exports = rpsCommand;
