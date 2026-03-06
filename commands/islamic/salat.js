const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment-timezone');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

const DB_DIR = path.join(__dirname, '../data');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

function getDbPath(sock) {
    let num = 'default';
    if (sock && sock.user && sock.user.id) {
        num = sock.user.id.split(':')[0];
    }
    return path.join(DB_DIR, `prayer_settings_${num}.json`);
}

// In-memory cache
const cityCache = {};

function loadSettings(sock) {
    try {
        const file = getDbPath(sock);
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
    }
    return {};
}

function saveSettings(sock, data) {
    try {
        const file = getDbPath(sock);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving settings:', e.message);
    }
}

async function getPrayerTimes(city) {
    const today = moment().tz('Africa/Casablanca').format('YYYY-MM-DD');
    if (cityCache[city] && cityCache[city].date === today) {
        return cityCache[city];
    }

    try {
        const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity`, {
            params: { city, country: 'Morocco', method: 3 }
        });
        const { timings, date } = response.data.data;
        cityCache[city] = {
            date: today,
            timings,
            hijri: date.hijri.date,
            gregorian: date.gregorian.date
        };
        return cityCache[city];
    } catch (e) {
        console.error(`Error fetching prayer times for ${city}:`, e.message);
        return null;
    }
}

async function salatCommand(sock, chatId, message, args) {
    try {
        const prayerSettings = loadSettings(sock);
        if (!prayerSettings[chatId]) {
            prayerSettings[chatId] = { city: 'Casablanca', enabled: true };
            saveSettings(sock, prayerSettings);
        }

        if (!args || args.length === 0) {
            const userSetting = prayerSettings[chatId];
            const city = userSetting.city;
            const data = await getPrayerTimes(city);

            if (!data) return await sendWithChannelButton(sock, chatId, `❌ تعذر جلب الأوقات لـ ${city}`, message);

            const { timings, hijri, gregorian } = data;
            const msgText = `╭━━━〘 🕌 *مواقيت الصلاة* 🕌 〙━━━╮\n` +
                `┃ 📍 *المدينة:* ${city}\n` +
                `┃ 📆 *التاريخ:* ${gregorian} | ${hijri}\n` +
                `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                `🌌 *الفجر:* ${timings.Fajr}\n` +
                `🌅 *الشروق:* ${timings.Sunrise}\n` +
                `☀️ *الظهر:* ${timings.Dhuhr}\n` +
                `🌤️ *العصر:* ${timings.Asr}\n` +
                `🌇 *المغرب:* ${timings.Maghrib}\n` +
                `🌃 *العشاء:* ${timings.Isha}\n\n` +
                `🔔 *تنبيهات:* ${userSetting.enabled ? 'مفعلة ✅' : 'معطلة 🔕'}\n` +
                `💡 *نصيحة:* .salat [المدينة] للتغيير\n` +
                `📖 *الجمعة:* .salat jumaa\n\n` +
                `⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, msgText, message);
        }

        const action = args[0].toLowerCase();
        if (action === 'jumaa' || action === 'friday' || action === 'جمعة') {
            const jumaaMsg = `🕌 *آداب وفضائل الجمعة*\n\n` +
                `✨ قال ﷺ: «من غسل واغتسل وبكر وابتكر... كان له بكل خطوة عمل سنة أجر صيامها وقيامها».\n\n` +
                `💡 *السنن المهجورة:*\n` +
                `1️⃣ الاغتسال واللباس الحسن.\n` +
                `2️⃣ التبكير (قبل صعود الإمام للمنبر).\n` +
                `3️⃣ قراءة سورة الكهف.\n` +
                `4️⃣ كثرة الصلاة على النبي ﷺ.\n\n` +
                `⚠️ *تنبيه:* إذا صعد الإمام المنبر أغلقت الملائكة الصحف.\n\n` +
                `⚔️ ${settings.botName}`;
            return await sendWithChannelButton(sock, chatId, jumaaMsg, message);
        }

        if (['on', 'off'].includes(action)) {
            prayerSettings[chatId].enabled = (action === 'on');
            saveSettings(sock, prayerSettings);
            return await sendWithChannelButton(sock, chatId, `🔔 تم ${action === 'on' ? 'تفعيل' : 'إيقاف'} التنبيهات.`, message);
        }

        // Treat any other arg as city
        const city = args.join(' ');
        const check = await getPrayerTimes(city);
        if (!check) return await sendWithChannelButton(sock, chatId, `❌ مدينة غير صحيحة: ${city}`, message);

        prayerSettings[chatId].city = city;
        saveSettings(sock, prayerSettings);
        return await sendWithChannelButton(sock, chatId, `✅ تم ضبط المدينة: ${city}`, message);

    } catch (e) {
        console.error('Salat Error:', e);
    }
}

function startPrayerScheduler(sock) {
    const task = cron.schedule('* * * * *', async () => {
        const currentSock = sock;
        if (!currentSock || !currentSock.user) return;

        const prayerSettings = loadSettings(currentSock);
        const now = moment().tz('Africa/Casablanca');
        const currentTime = now.format('HH:mm');

        for (const chatId in prayerSettings) {
            const user = prayerSettings[chatId];
            if (!user.enabled) continue;

            const city = user.city || 'Casablanca';
            // Default to Morocco/Casablanca if not specified, matching user request
            const data = await getPrayerTimes(city);
            if (!data) continue;

            // Import getRandomDua dynamically to avoid circular dependency issues at startup
            let randomDua = "اللهم تقبل منا ومنكم صالح الأعمال";
            try {
                const { getRandomDua } = require('./ad3iya');
                const duaObj = getRandomDua();
                randomDua = duaObj.dua;
            } catch (e) { }

            const prayers = {
                'الفجر': data.timings.Fajr,
                'الظهر': data.timings.Dhuhr,
                'العصر': data.timings.Asr,
                'المغرب': data.timings.Maghrib,
                'العشاء': data.timings.Isha
            };

            for (const [name, time] of Object.entries(prayers)) {
                if (time === currentTime) {
                    const runKey = `${chatId}_${name}_${now.format('YYYY-MM-DD')}`;
                    if (!currentSock.prayersLastSent) currentSock.prayersLastSent = {};
                    if (currentSock.prayersLastSent[runKey]) continue;
                    currentSock.prayersLastSent[runKey] = true;

                    // Clean up old keys (keep only current date)
                    const todayDate = now.format('YYYY-MM-DD');
                    Object.keys(currentSock.prayersLastSent).forEach(key => {
                        if (!key.endsWith(todayDate)) delete currentSock.prayersLastSent[key];
                    });

                    const tips = [
                        "💡 الصلاة نور، فلا تطفئ نورك.",
                        "💡 أرحنا بها يا بلال.",
                        "💡 أقرب ما يكون العبد من ربه وهو ساجد.",
                        "✨ تحدي: حاول صلاة السنن الرواتب اليوم.",
                        "🌱 نصيحة: بادر بالوضوء فور سماع النداء."
                    ];
                    const randomTip = tips[Math.floor(Math.random() * tips.length)];

                    const sorted = Object.entries(prayers);
                    const idx = sorted.findIndex(p => p[0] === name);
                    const next = sorted[(idx + 1) % sorted.length];

                    const progress = ["○", "○", "○", "○", "○"];
                    for (let i = 0; i <= idx; i++) progress[i] = "●";

                    const msg = `╭━━━〘 🕌 *نداء الحق* 🕌 〙━━━╮\n` +
                        `┃ ✨ *صلاة ${name}*\n` +
                        `┃ ⏰ *الوقت:* ${time}\n` +
                        `┃ 📍 *المدينة:* ${city}\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `📊 *تقدمك اليوم:*\n` +
                        `   ${progress.join('──')}\n` +
                        `   🕰️ *التالية:* ${next[0]} (${next[1]})\n\n` +
                        `🌟 *دعاء مستجاب:* ${randomDua}\n\n` +
                        `⚠️ *تذكير:* ${randomTip}\n` +
                        `🤲 *الله يتقبل! لا تنسونا من صالح دعائكم.*\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `⚔️ ${settings.botName}`;

                    try {
                        await sendWithChannelButton(currentSock, chatId, msg);
                    } catch (e) { }
                }
            }
        }
    });
    return task;
}

module.exports = salatCommand;
module.exports.startPrayerScheduler = startPrayerScheduler;
module.exports.autoSubscribe = (sock, chatId) => {
    const settings = loadSettings(sock);
    if (!settings[chatId]) {
        settings[chatId] = { city: 'Casablanca', enabled: true };
        saveSettings(sock, settings);
    }
};
