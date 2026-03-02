const axios = require('axios');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function carCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();

        if (!query) {
            const helpMsg = `🚗 *دليل السيارات* 🚗

🔹 *الاستخدام:*
${settings.prefix}car [نوع السيارة]
${settings.prefix}sayara [نوع السيارة]

📝 *أمثلة:*
• ${settings.prefix}car Mercedes G-Class
• ${settings.prefix}sayara Toyota Supra
• ${settings.prefix}car BMW M4

⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        await sendWithChannelButton(sock, chatId, `⏳ جاري البحث عن معلومات السيارة "${query}"...`, message);

        // This is a placeholder for a real car API. 
        // For now, providing a high-quality Google Search and basic structured info if possible.
        // In a real scenario, we'd use a specific Car API.

        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' specifications price features')}`;

        let carInfo = `🚗 *معلومات السيارة: ${query}* 🚗\n\n`;
        carInfo += `📝 *البحث الشامل:* \nيمكنك العثور على المواصلات التقنية، السعر، والمميزات هنا:\n🔗 ${googleSearchUrl}\n\n`;
        carInfo += `📊 *مواقع متخصصة:* \n`;
        carInfo += `• Drive.com.au\n`;
        carInfo += `• CarAndDriver.com\n`;
        carInfo += `• AutoTrader.com\n\n`;
        carInfo += `💡 *نصيحة:* ابحث عن الموديل والسنة للحصول على أفضل النتائج.\n\n`;
        carInfo += `⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: carInfo }, { quoted: message });

    } catch (error) {
        console.error('Error in car command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء البحث.`, message);
    }
}

module.exports = carCommand;
