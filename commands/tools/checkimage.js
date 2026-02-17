const axios = require('axios');
const FormData = require('form-data');
const { sendWithChannelButton } = require('../lib/channelButton');
const settings = require('../settings');

class SightEngineClient {
    constructor() {
        this.apiUser = "505217032";
        this.apiSecret = "YPKBoEVgfG4ueygPnXCneBX55uygVEy7";
        this.baseURL = "https://api.sightengine.com/1.0/check.json";
        this.models = ["nudity-2.1", "weapon", "alcohol", "recreational_drug", "medical", "properties", "type", "quality", "offensive-2.0", "faces", "text-content", "face-age", "gore-2.0", "text", "qr-content", "tobacco", "genai", "violence", "self-harm", "money", "gambling"];
    }

    async generate({ image, model }) {
        const models = this.validateModel(model);
        const formData = new FormData();
        formData.append("models", models);
        formData.append("api_user", this.apiUser);
        formData.append("api_secret", this.apiSecret);

        if (Buffer.isBuffer(image)) {
            formData.append("media", image, { filename: "image.jpg" });
        } else if (typeof image === "string" && image.startsWith("http")) {
            const response = await axios.get(image, { responseType: "arraybuffer" });
            formData.append("media", Buffer.from(response.data), { filename: "image.jpg" });
        } else {
            throw new Error("تنسيق الصورة غير مدعوم");
        }

        const response = await axios.post(this.baseURL, formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        });

        return response.data;
    }

    validateModel(model) {
        const defaultModels = "nudity-2.1,weapon,gore-2.0,type,properties";
        const input = (model || defaultModels).split(",").map(m => m.trim()).filter(m => m);
        const valid = input.filter(m => this.models.includes(m));
        return valid.length === 0 ? "nudity-2.1" : valid.join(",");
    }
}

async function checkImageCommand(sock, chatId, msg, args) {
    let quoted = msg.quoted ? msg.quoted : msg;
    const isImage = quoted.mtype === 'imageMessage' || (quoted.msg && quoted.msg.mimetype && quoted.msg.mimetype.includes('image'));

    if (!isImage) {
        const helpMsg = `🔍 *محلل محتوى الصور (SightEngine)* 🔍

🔹 *الاستخدام:*
قم بالرد على صورة بالأمر:
${settings.prefix}checkimage
أو
${settings.prefix}tahlil-soura

💡 هذا الأمر يقوم بفحص الصورة بحثاً عن:
- العري والمحتوى الحساس
- الأسلحة
- العنف والدماء
- نوع الصورة وجودتها

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        await sendWithChannelButton(sock, chatId, '🔍 *جاري تحليل محتوى الصورة...* يرجى الانتظار.', msg);

        const media = await (quoted.download ? quoted.download() : sock.downloadMediaMessage(quoted));
        if (!media) throw new Error("تعذر تحميل الصورة");

        const api = new SightEngineClient();
        const userModels = args.join(',') || null;

        const data = await api.generate({
            image: media,
            model: userModels
        });

        let caption = `🔍 *نتائج تحليل الصورة*\n\n`;

        if (data.nudity) {
            const nud = data.nudity;
            caption += `🔞 *المحتوى الحساس:* \n`;
            caption += `• مكشوف: ${(nud.sexual_display * 100).toFixed(1)}%\n`;
            caption += `• إيحاءات: ${(nud.sexual_activity * 100).toFixed(1)}%\n`;
            caption += `• ملابس ضيقة: ${(nud.suggestive * 100).toFixed(1)}%\n\n`;
        }

        if (data.weapon !== undefined) {
            caption += `🔫 *الأسلحة:* ${(data.weapon * 100).toFixed(1)}%\n`;
        }

        if (data.gore) {
            caption += `🩸 *العنف/الدماء:* ${(data.gore.prob * 100).toFixed(1)}%\n`;
        }

        if (data.type) {
            caption += `🖼️ *نوع الصورة:* ${data.type.is_illustration > 0.5 ? 'رسم/توضيح' : 'صورة فوتوغرافية'}\n`;
        }

        caption += `\n✅ *الحالة:* ${data.status === 'success' ? 'تم الفحص بنجاح' : 'فشل'}\n`;
        caption += `⚔️ ${settings.botName}`;

        await sock.sendMessage(chatId, { text: caption }, { quoted: msg });

    } catch (e) {
        console.error('Error in checkimage:', e);
        await sendWithChannelButton(sock, chatId, `❌ حدث خطأ أثناء التحليل: ${e.message}`, msg);
    }
}

module.exports = checkImageCommand;
