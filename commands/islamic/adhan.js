const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

async function adhanCommand(sock, chatId, message, args) {
    try {
        const adhanMsg = `🕌 *الأذان والأذكار الصوتية* 鐘\n\n` +
            `1. 🕋 *أذان الحرم المكي* (بصوت جميل)\n` +
            `2. 🕌 *أذان الحرم المدني*\n` +
            `3. 🌅 *أذكار الصباح* (صوتية)\n` +
            `4. 🌙 *أذكار المساء* (صوتية)\n\n` +
            `📝 *الاستخدام:* \n` +
            `.adan 1 - لسماع أذان مكة\n` +
            `.adan 2 - لسماع أذان المدينة\n` +
            `.adan 3 - أذكار الصباح\n` +
            `.adan 4 - أذكار المساء\n\n` +
            `⚔️ ${settings.botName}`;

        if (!args[0]) {
            return await sendWithChannelButton(sock, chatId, adhanMsg, message);
        }

        const choice = args[0];
        let audioUrl = "";
        let caption = "";

        if (choice === '1') {
            audioUrl = "https://files.catbox.moe/k2cl94.mp3"; // Stable Makkah Adhan
            caption = "🕋 أذان الحرم المكي الشريف";
        } else if (choice === '2') {
            audioUrl = "https://files.catbox.moe/nm8z9p.mp3"; // Stable Madinah Adhan
            caption = "🕌 أذان الحرم المدني الشريف";
        } else if (choice === '3') {
            audioUrl = "https://files.catbox.moe/8u7g9k.mp3"; // Morning adhkar
            caption = "🌅 أذكار الصباح";
        } else if (choice === '4') {
            audioUrl = "https://files.catbox.moe/54s34d.mp3"; // Evening adhkar
            caption = "🌙 أذكار المساء";
        } else {
            return await sendWithChannelButton(sock, chatId, "❌ اختيار خاطئ. استخدم الرقم من 1 لـ 4.", message);
        }

        await sock.sendMessage(chatId, { text: `⏳ *جاري جلب المقطع الصوتي:* ${caption}` }, { quoted: message });

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: message });

    } catch (error) {
        console.error('Error in adhan command:', error);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء جلب الصوت.`, message);
    }
}

module.exports = adhanCommand;
