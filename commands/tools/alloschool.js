const axios = require('axios');
const cheerio = require('cheerio');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../../settings');

// Helper function to send interactive response
async function response(sock, jid, data, quoted) {
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({ text: data.body }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: data.footer }),
                    header: proto.Message.InteractiveMessage.Header.create({ title: data.title }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({ title: '📌 اضغط لاختيار الفرض أو الدرس', sections: data.sections })
                        }]
                    })
                })
            }
        }
    }, { quoted });

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// Search function
async function searchAlloschool(query) {
    try {
        const response = await axios.get('https://www.alloschool.com/search?q=' + encodeURIComponent(query));
        const $ = cheerio.load(response.data);
        const results = [];

        $('ul.list-unstyled li').each((_, el) => {
            let title = $(el).find('a').text().trim();
            let url = $(el).find('a').attr('href');
            if (/^https?:\/\/www\.alloschool\.com\/element\/\d+$/.test(url)) {
                results.push({ title, url });
            }
        });

        return results.slice(0, 10); // Limit to 10
    } catch (error) {
        console.error('Search Error:', error);
        return [];
    }
}

// Get file function
async function getAlloschool(url) {
    try {
        const pdfRegex = /\.pdf$/i;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const files = [];

        $('a').each((_, link) => {
            const href = $(link).attr('href');
            const title = $(link).text().trim();
            if (pdfRegex.test(href)) {
                files.push({ title, url: href });
            }
        });

        return files;
    } catch (error) {
        console.error('Get File Error:', error);
        return [];
    }
}

async function alloschool(sock, chatId, msg, args) {
    // Determine command name used
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const commandName = messageText.slice(settings.prefix.length).trim().split(/ +/)[0].toLowerCase();

    const text = args.join(" ");

    const reply = async (txt) => {
        await sock.sendMessage(chatId, { text: txt }, { quoted: msg });
    };

    if (!text && !msg.quoted?.text) {
        return reply("📚 هذا الأمر مخصص للبحث عن الفروض والدروس والامتحانات من موقع **Alloschool**.\n📝 مثال:\n`.alloschool Antigone`\nثم اختيار الرابط وكتابة:\n`.alloschoolget (الرابط)`\n🎉 استمتع بالدراسة!");
    }

    const query = text || msg.quoted.text;

    await reply("⏳ جارٍ البحث، يُرجى الانتظار...");

    // Check if the input is a direct Alloschool URL
    const isUrl = /^https?:\/\/www\.alloschool\.com\/element\/\d+$/.test(query.trim());

    if (commandName === "alloschoolget" || isUrl) {
        try {
            await reply("⏳ جارٍ جلب الملفات...");
            let res = await getAlloschool(query.trim());
            if (!res.length) return reply("❌ لم يتم العثور على ملفات PDF في هذا الرابط.");

            // Loop through found files (limit to first one to avoid spam, or user custom logic)
            const file = res[0];
            await sock.sendMessage(chatId, {
                document: { url: file.url },
                fileName: `${file.title}.pdf`,
                mimetype: 'application/pdf',
                caption: `📄 **${file.title}**\n\n${settings.botName}`
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            reply('❌ حدث خطأ أثناء تحميل الملف، يرجى المحاولة لاحقًا.');
        }
    } else {
        try {
            let res = await searchAlloschool(query);
            if (!res.length) return reply("❌ لم يتم العثور على نتائج.");

            // Fallback to text message for better reliability against session errors
            let responseText = "📚 *نتائج البحث من Alloschool:*\n\n";

            res.forEach((item, index) => {
                responseText += `*${index + 1}.* ${item.title}\n`;
                responseText += `🔗 *الرابط:* ${item.url}\n`;
                // Simplify instruction since now .alloschool URL works too
                responseText += `📥 *للتحميل:* \`.alloschool ${item.url}\`\n\n`;
            });

            responseText += `\n_${settings.botName}_`;

            // Send as standard text message
            await sock.sendMessage(chatId, {
                text: responseText,
                contextInfo: {
                    externalAdReply: {
                        title: "Alloschool Search",
                        body: `Found ${res.length} results`,
                        thumbnailUrl: "https://www.alloschool.com/assets/img/logo.png",
                        sourceUrl: "https://www.alloschool.com",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            reply('❌ حدث خطأ أثناء البحث، يرجى المحاولة لاحقًا.');
        }
    }
}

module.exports = alloschool;
