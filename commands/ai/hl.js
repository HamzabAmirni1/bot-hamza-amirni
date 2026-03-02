const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const settings = require('../../settings');
const { getObitoAnalyze } = require('../../lib/ai');

module.exports = async (sock, chatId, msg, args) => {
    try {
        let q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;
        let mime = (q.imageMessage || q.documentWithCaptionMessage?.message?.imageMessage)?.mimetype || "";

        if (!mime.startsWith("image/") && msg.message?.imageMessage) {
            q = msg.message;
            mime = msg.message.imageMessage.mimetype;
        }

        if (!mime.startsWith("image/")) {
            return await sock.sendMessage(chatId, {
                text: `*⎔ ⋅ ───━ •﹝🧠﹞• ━─── ⋅ ⎔*\n\n📝 *طريقة الاستخدام:* \nأرسل صورة مع سؤال أو رد على صورة مكتوباً:\n.hl من هذه الشخصية؟\n\n*${settings.botName}*`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "🧠", key: msg.key } });

        const buffer = await downloadMediaMessage(
            { message: q },
            "buffer",
            {},
            { logger: pino({ level: "silent" }) },
        );

        let textInCmd = args.join(" ");
        const lowerText = textInCmd.toLowerCase();
        const isExercise = lowerText.match(/tmrin|tamrin|tmarin|تمرين|تمارين|exer|devoir|jawb|ajib|أجب|حل|solve|question|sujet|exam/);

        let prompt;
        if (isExercise) {
            prompt = `تصرف كأستاذ ذكي وخبير. قم بحل هذا التمرين أو السؤال الموجود في الصورة بالتفصيل الممل، خطوة بخطوة. اشرح الطريقة والنتيجة بوضوح. سياق السؤال: ${textInCmd}`;
        } else {
            prompt = textInCmd
                ? `قم بتحليل الصورة بدقة، ثم أجب على سؤال المستخدم بناءً على ما تراه في الصورة. سؤال المستخدم هو: "${textInCmd}"`
                : "صف ما يوجد في هذه الصورة بالتفصيل الممل (الأشخاص، الأشياء، المكان، الألوان، النصوص إن وجدت).";
        }

        const result = await getObitoAnalyze(buffer, prompt, mime);

        if (result) {
            const formattedReply = `*⎔ ⋅ ───━ •﹝🤖 التحليل الذكي ﹞• ━─── ⋅ ⎔*\n\n${result}\n\n*${settings.botName}*\n*⎔ ⋅ ───━ •﹝✅﹞• ━─── ⋅ ⎔*`;
            await sock.sendMessage(chatId, { text: formattedReply }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: "❌ أعتذر، مقدرتش نحلل هاد الصورة فهاد اللحظة. جرب مرة أخرى." }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: result ? "✅" : "❌", key: msg.key } });

    } catch (err) {
        console.error("Vision Processing Error:", err);
        await sock.sendMessage(chatId, { text: "❌ وقع مشكل فمعالجة هاد الصورة." }, { quoted: msg });
    }
};
