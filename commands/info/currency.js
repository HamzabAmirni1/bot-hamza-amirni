const axios = require('axios');
const { sendWithChannelButton } = require('../lib/channelButton');

async function currencyCommand(sock, chatId, message, args) {
    try {
        if (!args || args.length === 0) {
            const helpMsg = `💱 *محول العملات*

🔹 *الاستخدام:*
.currency [المبلغ] [من] [إلى]
.sarf [المبلغ] [من] [إلى]

📝 *أمثلة:*
• .currency 100 USD MAD
• .currency 50 EUR MAD
• .sarf 1000 درهم دولار
• .currency 1 BTC USD

💰 *العملات الشائعة:*
• MAD - الدرهم المغربي
• USD - الدولار الأمريكي
• EUR - اليورو
• SAR - الريال السعودي
• AED - الدرهم الإماراتي
• GBP - الجنيه الإسترليني
• BTC - البيتكوين

⚔️ Hamza Amirni Bot`;

            return await sendWithChannelButton(sock, chatId, helpMsg, message);
        }

        // Parse arguments
        let amount = parseFloat(args[0]);
        let fromCurrency = args[1]?.toUpperCase();
        let toCurrency = args[2]?.toUpperCase();

        // Map Arabic currency names
        const currencyMap = {
            'درهم': 'MAD',
            'دولار': 'USD',
            'يورو': 'EUR',
            'ريال': 'SAR',
            'جنيه': 'GBP',
            'دينار': 'TND'
        };

        if (currencyMap[args[1]?.toLowerCase()]) {
            fromCurrency = currencyMap[args[1].toLowerCase()];
        }
        if (currencyMap[args[2]?.toLowerCase()]) {
            toCurrency = currencyMap[args[2].toLowerCase()];
        }

        if (!amount || !fromCurrency || !toCurrency) {
            return await sendWithChannelButton(sock, chatId,
                `❌ *صيغة خاطئة!*\n\n✅ الاستخدام الصحيح:\n.currency [المبلغ] [من] [إلى]\n\nمثال:\n.currency 100 USD MAD`,
                message);
        }

        await sendWithChannelButton(sock, chatId, '⏳ جاري التحويل...', message);

        // Use free currency API
        const apiUrl = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        if (response.data && response.data.rates && response.data.rates[toCurrency]) {
            const rate = response.data.rates[toCurrency];
            const result = (amount * rate).toFixed(2);
            const date = new Date(response.data.time_last_updated * 1000).toLocaleDateString('ar');

            let resultMsg = `💱 *نتيجة التحويل*\n\n`;
            resultMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            resultMsg += `💰 *المبلغ:* ${amount.toLocaleString()} ${fromCurrency}\n`;
            resultMsg += `💵 *النتيجة:* ${parseFloat(result).toLocaleString()} ${toCurrency}\n\n`;
            resultMsg += `📊 *سعر الصرف:* 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}\n`;
            resultMsg += `📅 *آخر تحديث:* ${date}\n\n`;
            resultMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            // Add some common conversions
            if (fromCurrency === 'MAD') {
                resultMsg += `💡 *تحويلات شائعة من ${amount} درهم:*\n`;
                const usd = (amount * response.data.rates['USD']).toFixed(2);
                const eur = (amount * response.data.rates['EUR']).toFixed(2);
                const sar = (amount * response.data.rates['SAR']).toFixed(2);
                resultMsg += `• ${usd} USD (دولار)\n`;
                resultMsg += `• ${eur} EUR (يورو)\n`;
                resultMsg += `• ${sar} SAR (ريال)\n\n`;
            }

            resultMsg += `⚔️ Hamza Amirni Bot`;

            await sock.sendMessage(chatId, { text: resultMsg }, { quoted: message });

        } else {
            throw new Error('Currency not found');
        }

    } catch (error) {
        console.error('Error in currency command:', error);

        let errorMsg = '❌ حدث خطأ في التحويل\n\n';

        if (error.response && error.response.status === 404) {
            errorMsg += '⚠️ العملة غير موجودة\n\n';
            errorMsg += '💡 تأكد من رمز العملة الصحيح:\n';
            errorMsg += '• MAD - الدرهم المغربي\n';
            errorMsg += '• USD - الدولار\n';
            errorMsg += '• EUR - اليورو\n';
        } else {
            errorMsg += '💡 جرب مرة أخرى أو تحقق من الاتصال بالإنترنت';
        }

        await sendWithChannelButton(sock, chatId, errorMsg, message);
    }
}

module.exports = currencyCommand;
