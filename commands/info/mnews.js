const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function mnewsCommand(sock, chatId, message, args) {
    try {
        await sendWithChannelButton(sock, chatId, '⏳ جاري جلب آخر أخبار المغرب...', message);

        // API Key
        const apiKey = 'dcd720a6f1914e2d9dba9790c188c08c';

        // Fetch news specifically for Morocco (MA)
        const url = `https://newsapi.org/v2/top-headlines?country=ma&apiKey=${apiKey}`;

        let response = await axios.get(url);
        let articles = response.data.articles.filter(a => a.title && a.title !== '[Removed]').slice(0, 5);

        if (articles.length === 0) {
            // Search by keyword if country headlines are empty
            const searchUrl = `https://newsapi.org/v2/everything?q=Morocco&language=ar&sortBy=publishedAt&apiKey=${apiKey}`;
            response = await axios.get(searchUrl);
            articles = response.data.articles.slice(0, 5);
        }

        if (articles.length === 0) {
            return await sendWithChannelButton(sock, chatId, `❌ عذراً، لم أتمكن من العثور على أخبار مغربية في هذه اللحظة.`, message);
        }

        let newsMessage = `🇲🇦 *أخبار المغرب العاجلة* 🇲🇦\n\n`;

        articles.forEach((article, index) => {
            newsMessage += `${index + 1}. *${article.title}*\n`;
            if (article.description) newsMessage += `📝 ${article.description.substring(0, 100)}...\n`;
            newsMessage += `🔗 ${article.url}\n\n`;
        });

        newsMessage += `⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: newsMessage }, { quoted: message });

    } catch (error) {
        console.error('Error in mnews command:', error);
        await sendWithChannelButton(sock, chatId, '❌ حدث خطأ أثناء جلب الأخبار المغربية.', message);
    }
}

module.exports = mnewsCommand;
