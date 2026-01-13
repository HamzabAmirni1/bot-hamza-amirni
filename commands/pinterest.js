const axios = require("axios");
const cheerio = require('cheerio');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../settings');

const base = "https://www.pinterest.com";
const search = "/resource/BaseSearchResource/get/";

const headers = {
    'accept': 'application/json, text/javascript, */*, q=0.01',
    'referer': 'https://www.pinterest.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'x-app-version': 'a9522f',
    'x-pinterest-appstate': 'active',
    'x-pinterest-pws-handler': 'www/[username]/[slug].js',
    'x-requested-with': 'XMLHttpRequest'
};

async function getCookies() {
    try {
        const response = await axios.get(base);
        const setHeaders = response.headers['set-cookie'];
        if (setHeaders) {
            const cookies = setHeaders.map(cookieString => cookieString.split(';')[0].trim()).join('; ');
            return cookies;
        }
        return null;
    } catch (error) {
        console.error("خطأ أثناء جلب الكوكيز:", error);
        return null;
    }
}

async function searchPinterest(query) {
    if (!query) {
        return { status: false, message: "يرجى إدخال كلمة بحث صحيحة!" };
    }

    try {
        const cookies = await getCookies();
        if (!cookies) {
            return { status: false, message: "فشل في استرجاع الكوكيز، حاول مرة أخرى لاحقًا." };
        }

        const params = {
            source_url: `/search/pins/?q=${query}`,
            data: JSON.stringify({
                options: { isPrefetch: false, query, scope: "pins", bookmarks: [""], page_size: 10 },
                context: {}
            }),
            _: Date.now()
        };

        const { data } = await axios.get(`${base}${search}`, { headers: { ...headers, 'cookie': cookies }, params });

        const results = data.resource_response.data.results.filter(v => v.images?.orig);
        if (results.length === 0) {
            return { status: false, message: `لم يتم العثور على نتائج لكلمة البحث: ${query}` };
        }

        return {
            status: true,
            pins: results.map(result => ({
                id: result.id,
                title: result.title || "بدون عنوان",
                description: result.description || "بدون وصف",
                pin_url: `https://pinterest.com/pin/${result.id}`,
                image: result.images.orig.url,
                uploader: {
                    username: result.pinner.username,
                    full_name: result.pinner.full_name,
                    profile_url: `https://pinterest.com/${result.pinner.username}`
                }
            }))
        };

    } catch (error) {
        return { status: false, message: "حدث خطأ أثناء البحث، حاول مرة أخرى لاحقًا." };
    }
}

async function pinterest(sock, chatId, msg, args) {
    const text = args.join(' ');

    const reply = async (text) => {
        await sock.sendMessage(chatId, { text: text }, { quoted: msg });
    };

    if (!text) {
        return reply(`• *مثال:*\n ${settings.prefix}pinterest cat`);
    }

    await reply('*_`جاري التحميل`_*');

    async function createImage(url) {
        const { imageMessage } = await generateWAMessageContent({
            image: { url }
        }, {
            upload: sock.waUploadToServer
        });
        return imageMessage;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    let result = await searchPinterest(text);
    if (!result.status) {
        return reply(`⚠️ ${result.message}`);
    }

    let pins = result.pins.slice(0, 5); // Limit to top 5 results
    shuffleArray(pins); // Randomize

    await reply(`🔍 *تم العثور على ${result.pins.length} نتيجة (يعرض 5).*`);

    for (let pin of pins) {
        await sock.sendMessage(chatId, {
            image: { url: pin.image },
            caption: `📌 *${pin.title}*\n📝 ${pin.description}\n👤 ${pin.uploader.full_name}\n🔗 ${pin.pin_url}`
        }, { quoted: msg });
    }
}

module.exports = pinterest;
