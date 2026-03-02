const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function hadithCommand(sock, chatId, message, args) {
    try {
        await sendWithChannelButton(sock, chatId, '⏳ جاري جلب حديث شريف...', message);

        // Using a free Hadith API
        const url = 'https://ahadith-api.herokuapp.com/api/ahadith/all/ar-notashkeel';
        // Note: Heroku apps might be slow or down. Let's use a more reliable one if possible.
        // Let's use a static collection if API fails or is slow.

        const backupHadiths = [
            "قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» (رواه البخاري ومسلم)",
            "قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ، وَفِي كُلٍّ خَيْرٌ» (رواه مسلم)",
            "قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ» (رواه البخاري)",
            "قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» (رواه البخاري ومسلم)",
            "قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «الدِّينُ النَّصِيحَةُ» (رواه مسلم)"
        ];

        let hadithText = "";

        try {
            // Attempt to get a random one from an API
            const response = await axios.get('https://api.sunnah.com/v1/collections', { timeout: 5000 }); // This is just an example
            // Since Sunnah API needs Key, I will use a simple random selection from static local list for speed and reliability.
            hadithText = backupHadiths[Math.floor(Math.random() * backupHadiths.length)];
        } catch (e) {
            hadithText = backupHadiths[Math.floor(Math.random() * backupHadiths.length)];
        }

        const responseMsg = `📖 *حديث شريف* 📖\n\n` +
            `${hadithText}\n\n` +
            `✨ صلوا على النبي محمد ﷺ\n\n` +
            `⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: responseMsg }, { quoted: message });

    } catch (error) {
        console.error('Error in hadith command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء جلب الحديث.`, message);
    }
}

module.exports = hadithCommand;
