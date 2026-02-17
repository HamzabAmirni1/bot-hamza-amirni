const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function movieCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();

        if (!query) {
            const helpMsg = `🎬 *الباحث عن الأفلام والمسلسلات* 🎬

🔹 *الاستخدام:*
${settings.prefix}movie [اسم الفيلم/المسلسل بالإنجليزية]
${settings.prefix}film [اسم الفيلم/المسلسل بالإنجليزية]

📝 *أمثلة:*
• ${settings.prefix}movie Avengers
• ${settings.prefix}film Breaking Bad
• ${settings.prefix}movie Joker

💡 *ملاحظة:* يفضل البحث بالاسم الإنجليزي للحصول على أدق النتائج.

⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        await sendWithChannelButton(sock, chatId, '⏳ جاري البحث عن معلومات الفيلم/المسلسل...', message);

        // Using OMDb API (Free tier) - You can replace the key if it expires
        const apiKey = '639f733f';
        const url = `http://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${apiKey}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.Response === "True") {
            let movieInfo = `🎬 *معلومات الفيلم/المسلسل* 🎬\n\n`;
            movieInfo += `🎥 *العنوان:* ${data.Title}\n`;
            movieInfo += `📅 *السنة:* ${data.Year}\n`;
            movieInfo += `🌟 *التقييم:* ${data.imdbRating}/10\n`;
            movieInfo += `🎭 *النوع:* ${data.Genre}\n`;
            movieInfo += `👤 *المخرج:* ${data.Director}\n`;
            movieInfo += `👥 *الممثلين:* ${data.Actors}\n`;
            movieInfo += `⏳ *المدة:* ${data.Runtime}\n`;
            movieInfo += `🌍 *اللغة:* ${data.Language}\n`;
            movieInfo += `🏆 *الجوائز:* ${data.Awards}\n\n`;
            movieInfo += `📝 *القصة:* \n${data.Plot}\n\n`;
            movieInfo += `⚔️ ${settings.botName}`;

            if (data.Poster && data.Poster !== "N/A") {
                await sock.sendMessage(chatId, {
                    image: { url: data.Poster },
                    caption: movieInfo
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: movieInfo }, { quoted: message });
            }
        } else {
            await sendWithChannelButton(sock, chatId, `❌ لم يتم العثور على نتائج لـ "${query}". تأكد من كتابة الاسم بشكل صحيح بالإنجليزية.`, message);
        }

    } catch (error) {
        console.error('Error in movie command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء البحث. حاول مرة أخرى لاحقاً.`, message);
    }
}

module.exports = movieCommand;
