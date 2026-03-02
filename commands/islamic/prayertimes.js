const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function prayerTimesCommand(sock, chatId, message, args) {
    console.log('🕌 Prayer times command called with args:', args);
    try {
        let city = args.join(' ');
        let country = 'Morocco'; // Default country

        // If no city provided, check if user has a saved city (future feature), for now default to Rabat
        if (!city) {
            city = 'Rabat';
        }

        // Handle composite input like "Casablanca Morocco"
        if (city.includes(' ')) {
            const parts = city.split(' ');
            city = parts[0];
            // If the user provided more than one word, assume the rest is country or multi-word city
            // For simplicity in this v1, we'll keep it simple or assume Morrocco context unless specified
        }

        const url = `http://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=3`; // Method 3 is Muslim World League, widely used in Morocco

        const response = await axios.get(url);
        const data = response.data.data;
        const timings = data.timings;
        const date = data.date.hijri;
        const gregorian = data.date.gregorian;

        const msgText = `🕌 *مواقيت الصلاة في ${city}* 🕌

📅 *التاريخ:* ${gregorian.date}
📅 *هجري:* ${date.day} ${date.month.ar} ${date.year}

━━━━━━━━━━━━━━━━━━━
🌌 *الفجر:* ${timings.Fajr}
🌅 *الشروق:* ${timings.Sunrise}
☀️ *الظهر:* ${timings.Dhuhr}
🌤️ *العصر:* ${timings.Asr}
🌇 *المغرب:* ${timings.Maghrib}
🌃 *العشاء:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━

⚔️ ${settings.botName}`;

        await sendWithChannelButton(sock, chatId, msgText, message);

    } catch (error) {
        console.error('Error fetching prayer times:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء جلب مواقيت الصلاة. تأكد من اسم المدينة وحاول مرة أخرى.' }, { quoted: message });
    }
}

module.exports = prayerTimesCommand;
