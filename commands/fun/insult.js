const insults = [
    "نتا بحال السحاب، ملي كتغبر كيكون نهار زوين! ✨",
    "كتفرح كاع الناس... ملي ك تخرج من لكروب! 😂",
    "كون كنتي كتاب، كون بغيت نسدو من الصفحة اللولة.",
    "ماشي مكلخ، غير عندك زهر خايب ف التفكير. 🧠",
    "الأسرار ديالك ديما ف الأمان عندي، حيت أصلاً ما كنسمع تال وحدة!",
    "نتا دليل بلي التطور كياخد استراحة بعض المرات. 🛑",
    "عندك شي حاجة ف وجهك... أوه، نسيت، هاداك غير وجهك.",
    "نتا بحال الأبديت ديال السيستام، كلما كنشوفك كنقول 'واش ضروري دابا؟'.",
    "نتا بحال 10 ريال، بوجهين وما كتسوا والو. 💸",
    "الأفكار ديالك ناضية لدرجة أنني سمعتهم كاملين قبل 10 سنين.",
    "نتا ماشي عگاز، نتا غير عندك طاقة إيجابية بزاف ف أنك ما دير والو. 💤",
    "دماغك خدام بـ Windows 95، ثقيل وقديم.",
    "نتا بحال دودان ف الطريق، تا واحد ما كيحملك ولكن كلشي كيدوز عليك.",
    "كتجمع الناس... غير باش يهضروا على شحال نتا مبرزط! 📢"
];

async function insultCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) return;

        let userToInsult;

        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToInsult = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!userToInsult) {
            await sock.sendMessage(chatId, {
                text: '❌ طاكي خونا ولا رد على ميساجو باش نعطيوه علاش كيقلب! 🔪'
            }, { quoted: message });
            return;
        }

        const insult = insults[Math.floor(Math.random() * insults.length)];

        await sock.sendMessage(chatId, {
            text: `اسمع أ @${userToInsult.split('@')[0]}... \n\n🔥 ${insult}`,
            mentions: [userToInsult]
        }, { quoted: message });
    } catch (error) {
        console.error('Error in insult command:', error);
        await sock.sendMessage(chatId, { text: '❌ وقع شي مشكل.' }, { quoted: message });
    }
}

module.exports = insultCommand;
