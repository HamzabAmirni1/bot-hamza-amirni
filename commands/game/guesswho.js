const settings = require('../settings');

const characters = [
    { name: "دنيا بطمة", hints: ["مغنية مغربية", "دوزيم عطاتها الشهرة (Studio 2M)", "معروفة بقضية حمزة مون بيبي"] },
    { name: "كريستيانو رونالدو", hints: ["لاعب كرة قدم برتغالي", "كنيتو كتبدا بحرف R", "لعب مع ريال مدريد"] },
    { name: "حسن الفد", hints: ["كوميدي مغربي", "معروف بـ كبور", "عندو الشنب"] },
    { name: "ليونيل ميسي", hints: ["لاعب أرجنتيني", "أسطورة برشلونة", "ربح كاس العالم 2022"] },
    { name: "سعد المجرد", hints: ["لمعلم", "أغانيه كيوصلو للملايين", "عاش مشاكل ففرنسا"] },
    { name: "عبد الإله بنكيران", hints: ["سياسي مغربي", "كان رئيس الحكومة", "اللحية والتقشاب"] },
    { name: "هتلر", hints: ["قائد ألماني", "سبب الحرب العالمية الثانية", "الشارب المربع"] },
    { name: "سبونج بوب", hints: ["شخصية كرتونية", "لونو صفر", "عايش فالبحر"] },
    { name: "الركراكي", hints: ["مدرب مغربي", "مول النية", "وصلنا للمربع الذهبي"] },
    { name: "ايلون ماسك", hints: ["أغنى رجل فالعالم", "مول تسلا وتويتر", "باغي يمشي للمريخ"] }
];

const sessions = new Map();

async function guessWhoCommand(sock, chatId, msg, args) {
    // Check answer
    if (sessions.has(chatId) && args.length > 0) {
        const session = sessions.get(chatId);
        const guess = args.join(' ').toLowerCase();

        if (guess.includes(session.char.name) || session.char.name.includes(guess)) {
            await sock.sendMessage(chatId, { text: `✅ *برافو!* هو/هي: ${session.char.name} 🎉` }, { quoted: msg });
            sessions.delete(chatId);
            return;
        }

        // Hint logic
        if (guess === 'hint' || guess === 'تلميح') {
            if (session.hintIndex < session.char.hints.length) {
                await sock.sendMessage(chatId, { text: `💡 *تلميح ${session.hintIndex + 1}:* ${session.char.hints[session.hintIndex]}` }, { quoted: msg });
                session.hintIndex++;
            } else {
                await sock.sendMessage(chatId, { text: `🛑 *سالاو التلميحات!* غير خمر دابا.` }, { quoted: msg });
            }
            return;
        }

        // Surrender
        if (guess === 'surrender' || guess === 'استسلام') {
            await sock.sendMessage(chatId, { text: `🏳️ *الجواب كان:* ${session.char.name}` }, { quoted: msg });
            sessions.delete(chatId);
            return;
        }

        await sock.sendMessage(chatId, { text: `❌ *غلط!* حاول مرة أخرى.` }, { quoted: msg });
        return;
    }

    // New Game
    const char = characters[Math.floor(Math.random() * characters.length)];
    sessions.set(chatId, { char, hintIndex: 0 });

    // Show first hint immediately? No, let user guess or ask for hint? 
    // Usually Akinator style is feedback. But this is "Guess Who".
    // Let's show Hint 1 immediately.

    // Actually, update hintCount
    sessions.get(chatId).hintIndex = 1;

    const text = `🕵️ *شكون أنا؟* 🕵️\n\nأنا شخصية معروفة.. حاول تعرفني!\n\n💡 *تلميح 1:* ${char.hints[0]}\n\nكتب سميتي باش تربح.\nكتب *hint* باش نعطيك تلميح آخر.\nكتب *surrender* للاستسلام.\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text }, { quoted: msg });
}

module.exports = guessWhoCommand;
