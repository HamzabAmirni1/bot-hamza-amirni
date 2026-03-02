const { buyItem, getUser } = require('../../lib/leveling');
const settings = require('../../settings');

const shopItems = {
    titles: [
        { id: 'الغني (Rich)', cost: 1000, type: 'title' },
        { id: 'العقرب (Scorpion)', cost: 2000, type: 'title' },
        { id: 'الملك (King)', cost: 5000, type: 'title' },
        { id: 'الأسطورة (Legend)', cost: 10000, type: 'title' },
        { id: 'مول الشي (Owner)', cost: 50000, type: 'title' }
    ],
    badges: [
        { id: '💎', cost: 500, type: 'badge' },
        { id: '🔥', cost: 1000, type: 'badge' },
        { id: '🚀', cost: 2000, type: 'badge' },
        { id: '👑', cost: 5000, type: 'badge' }
    ]
};

async function shopCommand(sock, chatId, msg, args) {
    const userId = msg.key.participant || msg.participant;
    const user = getUser(userId);

    // .shop buy [item]
    if (args[0] === 'buy') {
        const query = args.slice(1).join(' ').toLowerCase();

        // Flatten items for search
        const allItems = [...shopItems.titles, ...shopItems.badges];
        const item = allItems.find(i => i.id.toLowerCase().includes(query));

        if (!item) {
            return sock.sendMessage(chatId, { text: '❌ *ما لقيتش هاد الحاجة.* تأكد من السمية.' }, { quoted: msg });
        }

        if (buyItem(userId, item.id, item.cost, item.type)) {
            return sock.sendMessage(chatId, { text: `✅ *مبروك!* شريتي "${item.id}" بـ ${item.cost} 🪙.\n\nسير شوف .profile ديالك!` }, { quoted: msg });
        } else {
            return sock.sendMessage(chatId, { text: `❌ *ما عندكش الفلوس كافية!* خاصك ${item.cost} 🪙.` }, { quoted: msg });
        }
    }

    // Show Shop
    let text = `🛍️ *متجر البوت* 🛍️\n\n💰 *فلوسك:* ${user.coins} 🪙\n\n`;

    text += `🏷️ *الألقاب (Titles):*\n`;
    shopItems.titles.forEach(i => {
        text += `- *${i.id}*: ${i.cost} 🪙\n`;
    });

    text += `\n✨ *شارات (Badges):*\n`;
    shopItems.badges.forEach(i => {
        text += `- ${i.id}: ${i.cost} 🪙\n`;
    });

    text += `\n🛒 *للشراء:* اكتب ${settings.prefix}shop buy [السمية]\nمثال: ${settings.prefix}shop buy الملك\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = shopCommand;
