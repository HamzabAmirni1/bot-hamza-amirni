const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function recipeCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();

        if (!query) {
            const helpMsg = `🍳 *دليل الطبخ والوصفات* 🍳

🔹 *الاستخدام:*
${settings.prefix}recipe [اسم الأكلة]
${settings.prefix}wasfa [اسم الأكلة]

📝 *أمثلة:*
• ${settings.prefix}recipe Tajine
• ${settings.prefix}wasfa Couscous
• ${settings.prefix}recipe Pizza

⚔️ ${settings.botName}`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        await sendWithChannelButton(sock, chatId, `⏳ جاري البحث عن وصفة "${query}"...`, message);

        // Using TheMealDB API (Free)
        const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.meals && data.meals.length > 0) {
            const meal = data.meals[0];

            let recipeMsg = `🍳 *وصفة: ${meal.strMeal}* 🍳\n\n`;
            recipeMsg += `🌍 *الأصل:* ${meal.strArea}\n`;
            recipeMsg += `📂 *التصنيف:* ${meal.strCategory}\n\n`;

            recipeMsg += `🛒 *المكونات:*\n`;
            for (let i = 1; i <= 20; i++) {
                const ingredient = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ingredient && ingredient.trim() !== "") {
                    recipeMsg += `• ${ingredient} (${measure})\n`;
                }
            }

            recipeMsg += `\n📝 *طريقة التحضير:*\n${meal.strInstructions}\n\n`;

            if (meal.strYoutube) {
                recipeMsg += `📺 *فيديو الشرح:* ${meal.strYoutube}\n\n`;
            }

            recipeMsg += `⚔️ ${settings.botName}`;

            if (meal.strMealThumb) {
                await sock.sendMessage(chatId, {
                    image: { url: meal.strMealThumb },
                    caption: recipeMsg
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: recipeMsg }, { quoted: message });
            }
        } else {
            await sendWithChannelButton(sock, chatId, `❌ عذراً، لم أتمكن من العثور على وصفة لـ "${query}". حاول البحث بالإنجليزية.`, message);
        }

    } catch (error) {
        console.error('Error in recipe command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء البحث عن الوصفة.`, message);
    }
}

module.exports = recipeCommand;
