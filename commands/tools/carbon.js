const axios = require("axios");
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

class Carbonara {
    constructor() {
        this.api = "https://carbonara.solopov.dev/api/cook";
        this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    }

    async generate({ code, lang, ...rest }) {
        if (!code) throw new Error("❌ 'code' parameter cannot be empty.");

        const body = {
            code,
            language: lang || "auto",
            theme: rest.theme || "seti",
            backgroundColor: rest.backgroundColor || "rgba(171, 184, 195, 1)",
            dropShadow: rest.dropShadow ?? true,
            dropShadowBlurRadius: rest.dropShadowBlurRadius || "68px",
            dropShadowOffsetY: rest.dropShadowOffsetY || "20px",
            exportSize: rest.exportSize || "2x",
            fontSize: rest.fontSize || "14px",
            fontFamily: rest.fontFamily || "Hack",
            lineNumbers: rest.lineNumbers ?? false,
            ...rest
        };

        const res = await axios.post(this.api, body, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": this.ua
            },
            responseType: "arraybuffer"
        });

        return {
            buffer: Buffer.from(res.data),
            contentType: res.headers["content-type"]
        };
    }
}

async function carbonCommand(sock, chatId, msg, args, commands, userLang) {
    const text = args.join(' ').trim();

    if (!text) {
        const usage = `⚠️ *نقص في الكود مدخل (Code input missing)*

📝 *كيفاش تخدمو:*
\u200E${settings.prefix}carbon console.log("Hello World");

🔍 *تحديد اللغة:*
\u200E${settings.prefix}carbon lang:python print("Hello")`;

        return await sendWithChannelButton(sock, chatId, usage, msg);
    }

    // Detect language if provided e.g. lang:js
    let lang, code;
    if (text.startsWith("lang:")) {
        const split = text.split(" ");
        lang = split[0].replace("lang:", "").trim();
        code = split.slice(1).join(" ");
    } else {
        code = text;
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "🎨", key: msg.key } });

        const api = new Carbonara();
        const result = await api.generate({ code, lang });

        await sock.sendMessage(chatId, {
            image: result.buffer,
            caption: `✅ *تم إنتاج صورة الكود بنجاح!*\n\n⚔️ ${settings.botName}`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Carbon error:', e);
        await sock.sendMessage(chatId, { text: `❌ خطأ أثناء توليد الصورة:\n${e.message}` }, { quoted: msg });
    }
}

module.exports = carbonCommand;
