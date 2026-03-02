const axios = require('axios');
const settings = require('../../settings');
const { t } = require('../../lib/language');

/**
 * عرض قائمة السور لقارئ محدد
 */
async function quranSurahCommand(sock, chatId, msg, args, commands, userLang) {
    const reciterId = args[0];
    if (!reciterId) return;

    await sock.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

    try {
        const response = await axios.get(`https://mp3quran.net/api/v3/reciters?language=ar&reciter=${reciterId}`, { timeout: 10000 });
        const reciter = response.data.reciters[0];

        if (!reciter) throw new Error("Reciter not found");

        const surahList = reciter.moshaf[0].surah_list.split(',');
        const surahNames = [
            "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
            "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
            "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
            "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
            "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
            "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
            "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
            "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
            "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
            "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
            "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
            "المسد", "الإخلاص", "الفلق", "الناس"
        ];

        let text = `📖 *قائمة السور للقارئ: ${reciter.name}*\n\n`;
        text += `💡 *للتحميل، اكتب:* .qdl ${reciterId} [رقم السورة]\n\n`;

        // Create a formatted list (show 20 at a time or just tell them to use the number)
        // For better UX, we can send a few common ones or just instructions.

        let sections = [];
        const commonSurahs = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114];

        text += `✨ *سور شائعة:*\n`;
        commonSurahs.forEach(id => {
            if (surahList.includes(id.toString())) {
                text += `• ${id}. ${surahNames[id - 1]} → \`.qdl ${reciterId} ${id}\`\n`;
            }
        });

        text += `\n🔢 *أو اختر أي سورة من 1 إلى 114*`;

        await sock.sendMessage(chatId, { text }, { quoted: msg });

    } catch (e) {
        console.error('Error in quransurah:', e);
        await sock.sendMessage(chatId, { text: "❌ فشل جلب قائمة السور." }, { quoted: msg });
    }
}

quranSurahCommand.command = ['quransurah'];
module.exports = quranSurahCommand;
