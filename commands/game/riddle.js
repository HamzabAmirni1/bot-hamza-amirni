const settings = require('../../settings');

const riddles = [
    { question: "حاجيتك ماجيتك، على اللي كيمشي بلا رجلين ويبكي بلا عينين؟", answer: "السحاب", hint: "كاين فالسماء" },
    { question: "حاجيتك ماجيتك، على اللي فمو فكرشو، ولا كلا يبات يعطي الرائحة؟", answer: "المجمر", hint: "كنطيبو عليه" },
    { question: "حاجيتك ماجيتك، قد النملة وتهز الحملة؟", answer: "الملعقة", hint: "كناكلو بها" },
    { question: "حاجيتك ماجيتك، شي حاجة كتدخل ناشفة وكتخرج فازكة؟", answer: "الخبز", hint: "كناكلوه" },
    { question: "حاجيتك ماجيتك، على اللي عندو سنان وما كيعضش؟", answer: "المشطة", hint: "كنقادو بيها الشعر" },
    { question: "حاجيتك ماجيتك، على اللي كيسمع بلا وذنين وكيتكلم بلا لسان؟", answer: "التليفون", hint: "كلشي عندو" },
    { question: "حاجيتك ماجيتك، شنو هو الشيء اللي كلما خديتي منو كيكبر؟", answer: "الحفرة", hint: "فالأرض" },
    { question: "حاجيتك ماجيتك، بيضاء كالثلج، سوداء كالليل، أكالها حرام، وشربها حلال؟", answer: "المقبرة", hint: "مكان الموتى" },
    { question: "حاجيتك ماجيتك، على اللي كيحك ظهرو بلا يدين؟", answer: "الباب", hint: "كيتحل ويتسد" },
    { question: "حاجيتك ماجيتك، خالتك خت باط، خال ولدها شكون يجيك؟", answer: "باك", hint: "من العائلة" },
    { question: "حاجيتك ماجيتك، بلاد كحلة وناسها عبيد، ومفتاحها حديد؟", answer: "الدلاح", hint: "فاكهة صيفية" },
    { question: "حاجيتك ماجيتك، على اللي عندو العين وما كيشوفش؟", answer: "البرة", hint: "كنخيطو بيها" },
    { question: "حاجيتك ماجيتك، شنو هو الشيء اللي كيكون طوييييل ملي كيكون صغير، وكيقصار ملي كيكبر؟", answer: "الشمعة", hint: "كنضويو بيها" },
    { question: "حاجيتك ماجيتك، على اللي كيحيي الميت ويميت الحي؟", answer: "الماء", hint: "سر الحياة" },
    { question: "حاجيتك ماجيتك، طير طار فالدوار، لا ريش لا منقار؟", answer: "الدخان", hint: "كيطلع من العافية" },
    { question: "حاجيتك ماجيتك، على اللي كيدور على الدار بلا ما يتحرك؟", answer: "الحيط", hint: "جزء من البيت" },
    { question: "حاجيتك ماجيتك، على اللي كيشوف كلشي وما عندوش عينين؟", answer: "المراية", hint: "كنشوفو فيها راسنا" },
    { question: "حاجيتك ماجيتك، قدو قد الفار وصوتو فالدار؟", answer: "المنبه", hint: "كيفيقنا فالصباح" },
    { question: "حاجيتك ماجيتك، ملي كيمشي كيمشي، وملي كيجي كيرجع؟", answer: "الظل", hint: "تابعك ديما" },
    { question: "حاجيتك ماجيتك، عندو رجلين وما كيمشيش؟", answer: "الكرسي", hint: "كنجلسو عليه" },
    { question: "حاجيتك ماجيتك، شنو هو الشيء اللي كيكتب وما كيعرفش يقرا؟", answer: "الستيلو", hint: "كنكتبو بيه" },
    { question: "حاجيتك ماجيتك، اختك ومك، بنت خالتك، شنكون تجيك؟", answer: "اختك", hint: "من العائلة" },
    { question: "حاجيتك ماجيتك، على اللي كلما زدتي فيه كينقص؟", answer: "العمر", hint: "سنوات الحياة" },
    { question: "حاجيتك ماجيتك، ميت وكفنوه، ومنين جبدوه عاش؟", answer: "السيكار", hint: "يتشعل" },
    { question: "حاجيتك ماجيتك، على اللي قلبو بيض وكيكحل ملي كيكبر؟", answer: "الدلاح", hint: "من الداخل حمر" }
];

// Helper to normalize Arabic text for better matching
function normalizeText(text) {
    if (!text) return "";
    return text.trim().toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u0652]/g, "") // Remove Tashkeel
        .replace(/\s+/g, " ");
}

async function riddleCommand(sock, chatId, msg, args) {
    // If checking answer
    if (activeRiddles.has(chatId) && args.length > 0) {
        const session = activeRiddles.get(chatId);
        const userInput = args.join(' ').trim();
        const normalizedInput = normalizeText(userInput);
        const normalizedAnswer = normalizeText(session.answer);

        if (normalizedInput === 'hint' || normalizedInput === 'مساعدة') {
            await sock.sendMessage(chatId, { text: `💡 *تلميح:* ${session.hint}` }, { quoted: msg });
            return;
        } else if (normalizedInput === 'surrender' || normalizedInput === 'استسلام') {
            await sock.sendMessage(chatId, { text: `🏳️ *صافي استسلمتي؟* الجواب كان: ${session.answer}` }, { quoted: msg });
            activeRiddles.delete(chatId);
            return;
        }

        // Smart check: exact match OR normalized match OR partial overlap
        if (normalizedInput === normalizedAnswer ||
            (normalizedInput.length > 2 && normalizedAnswer.includes(normalizedInput)) ||
            (normalizedAnswer.length > 2 && normalizedInput.includes(normalizedAnswer))) {
            await sock.sendMessage(chatId, { text: `✅ *تبارك الله عليك!* جبتيها لاصقة: ${session.answer} 🎉` }, { quoted: msg });
            activeRiddles.delete(chatId);
            return;
        } else {
            // Only send error if it looks like a real attempt (more than 2 chars)
            if (userInput.length > 2) {
                await sock.sendMessage(chatId, { text: `❌ *لا ماشي هكاك!* (كتب 'مساعدة' للتلميح أو 'استسلام').` }, { quoted: msg });
            }
            return;
        }
    }

    // New riddle
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    activeRiddles.set(chatId, r);

    const text = `🧩 *حاجيتك ماجيتك* 🧩\n\n🤔 *اللغز:* ${r.question}\n\n👇 *باش تجاوب:* كتب الجواب ديريكت.\n💡 *بغيتي مساعدة؟* كتب 'مساعدة'.\n🏳️ *وحلتي؟* كتب 'استسلام'.\n\n⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: msg });
}

module.exports = riddleCommand;
