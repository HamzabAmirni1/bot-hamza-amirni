const axios = require('axios');
const cheerio = require('cheerio');
const { sendWithChannelButton } = require('../lib/channelButton');

async function footballCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim().toLowerCase();

        if (!query) {
            const helpMsg = `⚽ *نتائج ومباريات كرة القدم*

🔹 *الاستخدام:*
.football [اسم المنتخب أو الفريق]
.kora [اسم المنتخب أو الفريق]

📝 *أمثلة:*
• .football المغرب
• .football morocco
• .kora الرجاء
• .kora wydad

🇲🇦 *المنتخبات الشهيرة:*
• المغرب / Morocco
• مصر / Egypt
• الجزائر / Algeria
• تونس / Tunisia
• السعودية / Saudi Arabia

⚽ *الأندية المغربية:*
• الرجاء / Raja
• الوداد / Wydad
• الجيش / FUS Rabat

⚔️ Hamza Amirni Bot`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        await sendWithChannelButton(sock, chatId, '⏳ جاري البحث عن النتائج... الرجاء الانتظار', message);

        // Map common Arabic names to English
        const teamMap = {
            'المغرب': 'morocco',
            'مصر': 'egypt',
            'الجزائر': 'algeria',
            'تونس': 'tunisia',
            'السعودية': 'saudi arabia',
            'الإمارات': 'uae',
            'قطر': 'qatar',
            'العراق': 'iraq',
            'الأردن': 'jordan',
            'لبنان': 'lebanon',
            'فلسطين': 'palestine',
            'الرجاء': 'raja casablanca',
            'الوداد': 'wydad casablanca',
            'الجيش': 'fus rabat',
            'مالي': 'mali'
        };

        const searchTeam = teamMap[query] || query;

        // Try to get results from API-Football (free tier)
        try {
            // Using a free football API
            const apiUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchTeam)}`;
            const response = await axios.get(apiUrl, { timeout: 10000 });

            if (response.data && response.data.teams && response.data.teams.length > 0) {
                const team = response.data.teams[0];

                // Get last 5 events
                const eventsUrl = `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`;
                const eventsResponse = await axios.get(eventsUrl, { timeout: 10000 });

                let resultMsg = `⚽ *${team.strTeam}*\n\n`;
                resultMsg += `🏆 *الدوري:* ${team.strLeague || 'غير محدد'}\n`;
                resultMsg += `🏟️ *الملعب:* ${team.strStadium || 'غير محدد'}\n`;
                resultMsg += `📅 *تأسس:* ${team.intFormedYear || 'غير محدد'}\n`;
                resultMsg += `🌍 *الدولة:* ${team.strCountry || 'غير محدد'}\n\n`;

                if (eventsResponse.data && eventsResponse.data.results && eventsResponse.data.results.length > 0) {
                    resultMsg += `📊 *آخر المباريات:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    const matches = eventsResponse.data.results.slice(0, 5);
                    matches.forEach((match, index) => {
                        const homeTeam = match.strHomeTeam;
                        const awayTeam = match.strAwayTeam;
                        const homeScore = match.intHomeScore || '?';
                        const awayScore = match.intAwayScore || '?';
                        const date = match.dateEvent;
                        const status = match.strStatus || 'Finished';

                        resultMsg += `${index + 1}. ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n`;
                        resultMsg += `   📅 ${date} | ${status}\n\n`;
                    });
                } else {
                    resultMsg += `⚠️ لا توجد مباريات حديثة\n\n`;
                }

                // Get next event
                const nextUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${team.idTeam}`;
                const nextResponse = await axios.get(nextUrl, { timeout: 10000 });

                if (nextResponse.data && nextResponse.data.events && nextResponse.data.events.length > 0) {
                    resultMsg += `🔜 *المباراة القادمة:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                    const nextMatch = nextResponse.data.events[0];
                    resultMsg += `⚽ ${nextMatch.strHomeTeam} vs ${nextMatch.strAwayTeam}\n`;
                    resultMsg += `📅 ${nextMatch.dateEvent} - ${nextMatch.strTime || 'TBD'}\n`;
                    resultMsg += `🏆 ${nextMatch.strLeague}\n`;
                }

                resultMsg += `\n⚔️ Hamza Amirni Bot`;

                await sock.sendMessage(chatId, {
                    text: resultMsg,
                    contextInfo: team.strTeamBadge ? {
                        externalAdReply: {
                            title: team.strTeam,
                            body: `${team.strLeague} - ${team.strCountry}`,
                            thumbnailUrl: team.strTeamBadge,
                            sourceUrl: team.strWebsite || 'https://hamzaamirni.netlify.app',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    } : {}
                }, { quoted: message });

            } else {
                throw new Error('Team not found');
            }

        } catch (apiError) {
            console.error('API Error:', apiError.message);

            // Fallback: Provide manual search link
            const fallbackMsg = `⚠️ *لم يتم العثور على نتائج*

🔍 *ابحث يدوياً:*

📱 *Google:*
https://www.google.com/search?q=${encodeURIComponent(query + ' football results')}

📊 *FlashScore:*
https://www.flashscore.com/search/?q=${encodeURIComponent(query)}

⚽ *SofaScore:*
https://www.sofascore.com/search?q=${encodeURIComponent(query)}

🇲🇦 *للمنتخب المغربي:*
https://www.google.com/search?q=morocco+national+football+team+results

💡 *نصيحة:*
جرب البحث باسم الفريق بالإنجليزية للحصول على نتائج أفضل

⚔️ Hamza Amirni Bot`;

            await sendWithChannelButton(sock, chatId, fallbackMsg, message);
        }

    } catch (error) {
        console.error('Error in football command:', error);
        await sendWithChannelButton(sock, chatId,
            `❌ حدث خطأ أثناء البحث عن النتائج\n\n💡 جرب البحث في Google:\nhttps://www.google.com/search?q=${encodeURIComponent(args.join(' ') + ' football results')}`,
            message);
    }
}

module.exports = footballCommand;
