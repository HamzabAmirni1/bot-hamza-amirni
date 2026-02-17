const axios = require('axios');
const settings = require('../settings');

async function wikiCommand(sock, chatId, msg, args) {
    if (!args.length) {
        return await sock.sendMessage(chatId, { text: '❌ الرجاء كتابة ما تريد البحث عنه في ويكيبيديا، مثال: .wiki المغرب' }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        // Search Wikipedia (Arabic by default)
        const searchResponse = await axios.get(`https://ar.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`);

        if (!searchResponse.data[1].length) {
            return await sock.sendMessage(chatId, { text: '❌ لم يتم العثور على نتائج في ويكيبيديا.' }, { quoted: msg });
        }

        const title = searchResponse.data[1][0];
        const url = searchResponse.data[3][0];

        // Get summary
        const summaryResponse = await axios.get(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        const summary = summaryResponse.data.extract || "لا يوجد ملخص متاح.";
        const thumbnail = summaryResponse.data.thumbnail ? summaryResponse.data.thumbnail.source : null;

        let message = `📚 *ويكيبيديا: ${title}*\n\n${summary}\n\n🔗 *الرابط:* ${url}`;

        if (thumbnail) {
            await sock.sendMessage(chatId, {
                image: { url: thumbnail },
                caption: message,
                footer: settings.botName
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: message }, { quoted: msg });
        }

    } catch (error) {
        console.error('Wiki Error:', error);
        await sock.sendMessage(chatId, { text: '❌ حدث خطأ أثناء البحث في ويكيبيديا.' }, { quoted: msg });
        // Fallback or more info
    }
}

module.exports = wikiCommand;
