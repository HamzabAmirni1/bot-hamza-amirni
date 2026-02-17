const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function liveCommand(sock, chatId, message, args) {
    const query = args.join(' ').trim().toLowerCase();

    if (!query) {
        const helpMsg = `📺 *البث المباشر والقنوات* 📺

🔹 *الاستخدام:*
${settings.prefix}live [اسم القناة/الحدث]
${settings.prefix}mubashir [اسم القناة/الحدث]

📝 *أمثلة:*
• ${settings.prefix}live bein sports
• ${settings.prefix}live al jazeera
• ${settings.prefix}mubashir المغربية

📡 *قنوات متوفرة (روابط سريعة):*
1. الجزيرة مباشر
2. العربية
3. سكاي نيوز
4. الرياضية المغربية

⚔️ ${settings.botName}`;

        return await sendWithChannelButton(sock, chatId, helpMsg, message);
    }

    await sendWithChannelButton(sock, chatId, `⏳ جاري البحث عن روابط بث مباشر لـ "${query}"...`, message);

    // Common Streams Mapping (Example links)
    const streams = {
        'al jazeera': 'https://www.aljazeera.net/live',
        'الجزيرة': 'https://www.aljazeera.net/live',
        'alarabiya': 'https://www.alarabiya.net/live-stream',
        'العربية': 'https://www.alarabiya.net/live-stream',
        'bein sports': 'https://www.beinsports.com/ar/live',
        'المغربية': 'https://www.snrtlive.ma/al-aoula-live-v2',
        'الرياضية': 'https://www.snrtlive.ma/arryadia-live'
    };

    let streamUrl = streams[query] || `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' live stream')}`;

    let streamMsg = `📺 *بث مباشر: ${query.toUpperCase()}* 📺\n\n`;
    streamMsg += `🔗 *رابط المشاهدة:* \n${streamUrl}\n\n`;
    streamMsg += `💡 *ملاحظة:* يفضل فتح الرابط في المتصفح لمشاهدة أفضل.\n\n`;
    streamMsg += `⚔️ ${settings.botName}`;

    await sock.sendMessage(chatId, { text: streamMsg }, { quoted: message });
}

module.exports = liveCommand;
