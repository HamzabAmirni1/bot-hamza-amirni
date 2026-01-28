const { generateWAMessageFromContent, proto, generateWAMessageContent } = require('@whiskeysockets/baileys');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const settings = require('../settings');

/**
 * عرض قائمة السور لقارئ محدد
 */
async function quranSurahCommand(sock, chatId, msg, args, commands, userLang) {
    const reciterId = args[0];
    if (!reciterId) return;

    await sock.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

    try {
        const response = await axios.get(`https://mp3quran.net/api/v3/reciters?language=ar&reciter=${reciterId}`, { timeout: 10000 });
        const reciter = response.data.reciters[0];
        if (!reciter) throw new Error("Reciter not found");

        const surahList = reciter.moshaf[0].surah_list.split(',');
        const surahNames = [
            "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
            "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
            "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
            "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
            "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
            "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
            "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
            "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
            "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
            "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
            "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
            "المسد", "الإخلاص", "الفلق", "الناس"
        ];

        // Header Image
        let imageMessage = null;
        try {
            const islamicUrl = 'https://images.unsplash.com/photo-1542834759-42935210967a?q=80&w=1000&auto=format&fit=crop';
            const gen = await generateWAMessageContent({ image: { url: islamicUrl } }, { upload: sock.waUploadToServer });
            imageMessage = gen.imageMessage;
        } catch (e) { }

        const commonSurahIds = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114];
        const rows = commonSurahIds.filter(id => surahList.includes(id.toString())).map(id => ({
            title: `${id}. ${surahNames[id - 1]}`,
            id: `${settings.prefix}qdl ${reciterId} ${id.toString().padStart(3, '0')}`
        }));

        const listMessage = {
            title: "اختر سورة شائعة",
            sections: [{ title: "سور مختارة", rows }]
        };

        const interactiveMsg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `✨ *🎙️ مكتبة القارئ: ${reciter.name}* ✨\n\n` +
                                `يمكنك الاستماع وتحميل أي سورة متوفرة لهذا القارئ.\n` +
                                `▫️ اختر من السور الشائعة أدناه.\n` +
                                `▫️ أو اكتب: \`.qdl ${reciterId} [رقم السورة]\`\n\n` +
                                `📍 تصفح السور المتاحة 👇`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `乂 ${settings.botName}` }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: `قائمة سور ${reciter.name}`,
                            hasMediaAttachment: !!imageMessage,
                            imageMessage: imageMessage
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                { "name": "single_select", "buttonParamsJson": JSON.stringify(listMessage) },
                                { "name": "cta_url", "buttonParamsJson": JSON.stringify({ display_text: "قناتي الرسمية 🔔", url: settings.officialChannel }) },
                                { "name": "cta_url", "buttonParamsJson": JSON.stringify({ display_text: "أنستغرام 📸", url: settings.instagram }) },
                                { "name": "cta_url", "buttonParamsJson": JSON.stringify({ display_text: "فيسبوك 📘", url: settings.facebookPage }) },
                                { "name": "quick_reply", "buttonParamsJson": JSON.stringify({ display_text: "المطور 👑", id: ".owner" }) }
                            ]
                        })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, interactiveMsg.message, { messageId: interactiveMsg.key.id });

    } catch (e) {
        console.error('Error in quransurah:', e);
        await sock.sendMessage(chatId, { text: "❌ فشل جلب قائمة السور." }, { quoted: msg });
    }
}

quranSurahCommand.command = ['quransurah'];
module.exports = quranSurahCommand;
