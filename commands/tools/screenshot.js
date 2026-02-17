/*
📸 التقاط شاشة الموقع
By: حمزة اعمرني (Hamza Amirni)
channel: https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p
*/

const axios = require('axios');

async function Screenshot(url) {
    try {
        const response = await axios.get(`https://image.thum.io/get/png/fullpage/viewportWidth/2400/${url}`, {
            responseType: 'arraybuffer'
        });

        return {
            status: 200,
            type: 'image/png',
            buffer: response.data
        };
    } catch (err) {
        throw Error(err.message);
    }
}

async function handler(sock, chatId, msg, args) {
    const url = args.join(" ").trim();

    if (!url) {
        return await sock.sendMessage(chatId, {
            text: `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*\n` +
                `🌟 *أوامر التقاط الشاشة:*\n\n` +
                `📱 *التقاط موقع:*\n.سكرين <رابط>\n\n` +
                `📌 *مثال:*\n.سكرين https://google.com\n` +
                `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*`
        }, { quoted: msg });
    }

    try {
        const waitingMsg = await sock.sendMessage(chatId, {
            text: `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*\n` +
                `📸 جاري التقاط صورة الموقع...\n` +
                `⚡ قد يستغرق بضع ثواني\n` +
                `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*`
        }, { quoted: msg });

        let result = await Screenshot(url);

        await sock.sendMessage(chatId, { delete: waitingMsg.key });

        await sock.sendMessage(
            chatId,
            {
                image: result.buffer,
                caption: `*⎔ ⋅ ───━ •﹝📸 التقاط ناجح ﹞• ━─── ⋅ ⎔*\n\n` +
                    `✅ *تم التقاط الشاشة بنجاح*\n\n` +
                    `🌐 *الموقع:* ${url}\n` +
                    `🕐 *الوقت:* ${new Date().toLocaleString('ar-SA')}\n\n` +
                    `𝐇𝐀𝐌𝐙𝐀 𝐀𝐌𝐈𝐑𝐍𝐈\n` +
                    `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*`,
                contextInfo: {
                    externalAdReply: {
                        title: "التقاط شاشة الموقع",
                        body: "𝐇𝐀𝐌𝐙𝐀 𝐀𝐌𝐈𝐑𝐍𝐈",
                        sourceUrl: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p",
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            },
            { quoted: msg }
        );

    } catch (e) {
        await sock.sendMessage(chatId, {
            text: `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*\n` +
                `❌ *حدث خطأ أثناء التقاط الشاشة!*\n\n` +
                `📌 *السبب:* ${e.message}\n\n` +
                `🔄 *حلول مقترحة:*\n` +
                `• تأكد من صحة الرابط\n` +
                `• الموقع قد يكون محمي\n` +
                `• حاول مرة أخرى لاحقًا\n` +
                `*⎔ ⋅ ───━ •﹝📸﹞• ━─── ⋅ ⎔*`
        }, { quoted: msg });
    }
}

module.exports = handler;
