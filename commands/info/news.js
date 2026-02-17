const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

module.exports = async function (sock, chatId, msg, args) {
    try {
        const category = args[0]?.toLowerCase() || 'general';
        const validCategories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];

        if (args[0] === 'list' || args[0] === 'قائمة') {
            const listMsg = `📰 *قائمة تصنيفات الأخبار* 📰

• business (أعمال)
• entertainment (ترفيه)
• general (عام)
• health (صحة)
• science (علوم)
• sports (رياضة)
• technology (تقنية)

📝 *الاستخدام:*
${settings.prefix}news [التصنيف]
${settings.prefix}akhbar [التصنيف]

⚔️ ${settings.botName}`;
            return await sendWithChannelButton(sock, chatId, listMsg, msg);
        }

        const selectedCategory = validCategories.includes(category) ? category : 'general';

        await sendWithChannelButton(sock, chatId, `⏳ جاري جلب آخر أخبار (${selectedCategory})...`, msg);

        // API Key - from earlier
        const apiKey = 'dcd720a6f1914e2d9dba9790c188c08c';

        // Fetch news - try with US and AE (for Arabic content)
        const country = args.includes('ma') || args.includes('المغرب') ? 'ma' : 'ae'; // Using AE/EG for better Arabic news if available
        const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${selectedCategory}&apiKey=${apiKey}`;

        const response = await axios.get(url);
        const articles = response.data.articles.filter(a => a.title && a.title !== '[Removed]').slice(0, 5);

        if (articles.length === 0) {
            // Try US if Arabic countries have no articles for a specific category
            const backupUrl = `https://newsapi.org/v2/top-headlines?country=us&category=${selectedCategory}&apiKey=${apiKey}`;
            const backupRes = await axios.get(backupUrl);
            articles.push(...backupRes.data.articles.slice(0, 5));
        }

        let newsMessage = `📰 *آخر الأخبار (${selectedCategory})* 📰\n\n`;

        articles.forEach((article, index) => {
            newsMessage += `${index + 1}. *${article.title}*\n`;
            if (article.description) newsMessage += `📝 ${article.description.substring(0, 100)}...\n`;
            newsMessage += `🔗 ${article.url}\n\n`;
        });

        newsMessage += `\n💡 لتغيير التصنيف، أرسل: ${settings.prefix}news list\n`;
        newsMessage += `⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: newsMessage }, { quoted: msg });

    } catch (error) {
        console.error('Error fetching news:', error);
        await sendWithChannelButton(sock, chatId, '❌ عذراً، لم أتمكن من جلب الأخبار الآن. جرب لاحقاً.', msg);
    }
};
