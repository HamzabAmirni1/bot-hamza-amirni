const axios = require("axios");

// Set your NGL username here:
const NGL_USERNAME = "officialkango";

const settings = require('../../settings');

async function nglCommand(sock, chatId, msg, args) {
    const text = args.join(" ");

    if (!text) {
        await sock.sendMessage(chatId, {
            text: `❌ عافاك كتب شي ميساج.\n\nطريقة الاستخدام: ${settings.prefix}ngl [الميساج ديالك]`
        }, { quoted: msg });
        return;
    }

    try {
        // Send anonymous message to your NGL inbox
        const res = await axios.post("https://ngl.link/api/submit", {
            username: NGL_USERNAME,
            question: text,
            deviceId: (Math.random() + 1).toString(36).substring(7)
        });

        if (res.status === 200) {
            await sock.sendMessage(chatId, {
                text: `✅ صيفطت الميساج ديالك لمول NGL بالخفاء!\n\n📝 الميساج: "${text}"`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                text: "❌ ما قدرتش نصيفط الميساج. جرب مرة أخرى."
            }, { quoted: msg });
        }

    } catch (err) {
        console.error("nglCommand error:", err);
        await sock.sendMessage(chatId, {
            text: "❌ وقع مشكل ف إرسال الميساج لـ NGL."
        }, { quoted: msg });
    }
}

module.exports = nglCommand;
