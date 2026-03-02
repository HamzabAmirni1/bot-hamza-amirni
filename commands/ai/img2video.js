const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const { uploadToCatbox, uploadToTmpfiles } = require('../../lib/media');
const settings = require('../../settings');

module.exports = async (sock, chatId, msg, args) => {
    let q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;
    let mime = (q.imageMessage || q.documentWithCaptionMessage?.message?.imageMessage)?.mimetype || "";

    if (!mime.startsWith("image/") && msg.message?.imageMessage) {
        q = msg.message;
        mime = msg.message.imageMessage.mimetype;
    }

    if (!mime.startsWith("image/")) {
        return await sock.sendMessage(chatId, {
            text: `⚠️ *يرجى الرد على صورة لتحويلها لفيديو:*\n\n*.img2video <الوصف>*\n\nمثال:\n.img2video اجعلها تتحرك ببطء`
        }, { quoted: msg });
    }

    const prompt = args.join(" ");
    if (!prompt) {
        return await sock.sendMessage(chatId, {
            text: `⚠️ *نسيتي الوصف! ضروري تقولي كيفاش بغيتيها تكون*\n\nمثال:\n.img2video اجعل الشخصية تضحك`
        }, { quoted: msg });
    }

    let waitMsg;
    try {
        await sock.sendMessage(chatId, { react: { text: "🔁", key: msg.key } });
        waitMsg = await sock.sendMessage(chatId, { text: "⏳ جاري تحويل الصورة... هاد العملية كاتاخد شوية ديال الوقت" }, { quoted: msg });

        const buffer = await downloadMediaMessage(
            { message: q },
            "buffer",
            {},
            { logger: pino({ level: "silent" }) },
        );

        // Upload
        let imageUrl = await uploadToCatbox(buffer);
        if (!imageUrl) imageUrl = await uploadToTmpfiles(buffer);

        if (!imageUrl) throw new Error("فشل رفع الصورة للسيرفر.");

        const payload = {
            videoPrompt: prompt,
            videoAspectRatio: "16:9",
            videoDuration: 5,
            videoQuality: "540p",
            videoModel: "v4.5",
            videoImageUrl: imageUrl,
            videoPublic: false,
        };

        const gen = await axios.post("https://veo31ai.io/api/pixverse-token/gen", payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 60000,
        });

        const taskId = gen.data.taskId;
        if (!taskId) throw new Error("السيرفر عامر بزاف، جرب من بعد.");

        let videoUrl;
        const timeout = Date.now() + 300000; // 5 mins

        while (Date.now() < timeout) {
            await new Promise((r) => setTimeout(r, 20000));
            try {
                const res = await axios.post("https://veo31ai.io/api/pixverse-token/get", {
                    taskId,
                    videoPublic: false,
                    videoQuality: "540p",
                    videoAspectRatio: "16:9",
                    videoPrompt: prompt,
                }, { headers: { "Content-Type": "application/json" }, timeout: 15000 });

                if (res.data?.videoData?.url) {
                    videoUrl = res.data.videoData.url;
                    break;
                }
            } catch (e) { }
        }

        if (!videoUrl) throw new Error("تعطل السيرفر فالمعالجة.");

        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            caption: `🎥 *AI Video Generated*\n\n📝 *الوصف:* ${prompt}\n✅ تمت المعالجة بنجاح\n\n*🚀 ${settings.botName}*`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { delete: waitMsg.key });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error("Img2Video Error:", e);
        if (waitMsg) await sock.sendMessage(chatId, { edit: waitMsg.key, text: `❌ فشل إنشاء الفيديو: ${e.message}` });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
};
