const settings = require('../../settings');

async function menuGameCommand(sock, chatId, msg, args) {
    const text = `
🎮 *MEGA GAME MENU* 🎮

🕹️ *ألعاب فردية (Private / PvE):*
🎲 *\u200E${settings.prefix}guess* - خمن الرقم
🤖 *\u200E${settings.prefix}rps* - حجرة ورقة مقص
🕵️ *\u200E${settings.prefix}guesswho* - شكون أنا؟ (تلميحات)
🃏 *\u200E${settings.prefix}blackjack* - بلاك جاك (21)
🎰 *\u200E${settings.prefix}slots* - ماكينة القمار (777)
🧮 *\u200E${settings.prefix}math* - تحدي الحساب
🧩 *\u200E${settings.prefix}scramble* - رتب الكلمة
🧩 *\u200E${settings.prefix}riddle* - حاجيتك ماجيتك
🤔 *\u200E${settings.prefix}truefalse* - صح أم خطأ
🎭 *\u200E${settings.prefix}emojigame* - خمن الإيموجي

🔥 *ألعاب جماعية (Group / PvP):*
❌ *\u200E${settings.prefix}tictactoe* - لعبة XO
❓ *\u200E${settings.prefix}quiz* - مسابقة ثقافية
❤️ *\u200E${settings.prefix}love* - مقياس الحب
📊 *\u200E${settings.prefix}rate* - التقييم المضحك
🛳️ *\u200E${settings.prefix}ship* - زوج جوج (Match)

🏆 *نظام التنافس (Economy):*
👤 *\u200E${settings.prefix}profile* - البروفايل (XP & Level)
💰 *\u200E${settings.prefix}daily* - المصروف اليومي
🛍️ *\u200E${settings.prefix}shop* - المتجر
🥇 *\u200E${settings.prefix}top* - الترتيب (Leaderboard)

⚔️ *${settings.botName}*`;

    // Prepare Image
    let imageHandle = { url: settings.botThumbnail };
    if (!settings.botThumbnail.startsWith('http')) {
        const fs = require('fs');
        try {
            imageHandle = fs.readFileSync(settings.botThumbnail);
        } catch (e) {
            console.error('Failed to read local thumbnail:', e);
        }
    }

    await sock.sendMessage(chatId, {
        image: imageHandle,
        caption: text
    }, { quoted: msg });
}

module.exports = menuGameCommand;
