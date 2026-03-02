const { sendWithChannelButton } = require('../../lib/channelButton');
const axios = require('axios');
const { t } = require('../../lib/language');
const settings = require('../../settings');

const { getSurahNumber } = require('../../lib/quranUtils');
const { setSession } = require('../../lib/quranSession');

async function quranCommand(sock, chatId, msg, args, commands, userLang) {
    // If user provides arguments (e.g. .quran fatiha), show format selection card
    if (args.length > 0) {
        const query = args.join(' ').trim();
        const surahId = getSurahNumber(query);

        if (surahId) {
            // Show format selection card (Audio/Text/PDF)
            const { showSurahFormatCard } = require('./quranmp3');
            return showSurahFormatCard(sock, chatId, msg, surahId);
        }
    }

    const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

    // Surahs List
    const surahs = [
        "1. الفاتحة (Al-Fatiha)", "2. البقرة (Al-Baqarah)", "3. آل عمران (Al-Imran)", "4. النساء (An-Nisa)",
        "5. المائدة (Al-Ma'idah)", "6. الأنعام (Al-An'am)", "7. الأعراف (Al-A'raf)", "8. الأنفال (Al-Anfal)",
        "9. التوبة (At-Tawbah)", "10. يونس (Yunus)", "11. هود (Hud)", "12. يوسف (Yusuf)", "13. الرعد (Ar-Ra'd)",
        "14. إبراهيم (Ibrahim)", "15. الحجر (Al-Hijr)", "16. النحل (An-Nahl)", "17. الإسراء (Al-Isra)",
        "18. الكهف (Al-Kahf)", "19. مريم (Maryam)", "20. طه (Taha)", "21. الأنبياء (Al-Anbiya)",
        "22. الحج (Al-Hajj)", "23. المؤمنون (Al-Mu'minun)", "24. النور (An-Nur)", "25. الفرقان (Al-Furqan)",
        "26. الشعراء (Ash-Shu'ara)", "27. النمل (An-Naml)", "28. القصص (Al-Qasas)", "29. العنكبوت (Al-Ankabut)",
        "30. الروم (Ar-Rum)", "31. لقمان (Luqman)", "32. السجدة (As-Sajdah)", "33. الأحزاب (Al-Ahzab)",
        "34. سبأ (Saba)", "35. فاطر (Fatir)", "36. يس (Ya-Sin)", "37. الصافات (As-Saffat)", "38. ص (Sad)",
        "39. الزمر (Az-Zumar)", "40. غافر (Ghafir)", "41. فصلت (Fussilat)", "42. الشورى (Ash-Shura)",
        "43. الزخرف (Az-Zukhruf)", "44. الدخان (Ad-Dukhan)", "45. الجاثية (Al-Jathiya)", "46. الأحقاف (Al-Ahqaf)",
        "47. محمد (Muhammad)", "48. الفتح (Al-Fath)", "49. الحجرات (Al-Hujurat)", "50. ق (Qaf)",
        "51. الذاريات (Adh-Dhariyat)", "52. الطور (At-Tur)", "53. النجم (An-Najm)", "54. القمر (Al-Qamar)",
        "55. الرحمن (Ar-Rahman)", "56. الواقعة (Al-Waqi'a)", "57. الحديد (Al-Hadid)", "58. المجادلة (Al-Mujadila)",
        "59. الحشر (Al-Hashr)", "60. الممتحنة (Al-Mumtahana)", "61. الصف (As-Saff)", "62. الجمعة (Al-Jumu'a)",
        "63. المنافقون (Al-Munafiqun)", "64. التغابن (At-Taghabun)", "65. الطلاق (At-Talaq)", "66. التحريم (At-Tahrim)",
        "67. الملك (Al-Mulk)", "68. القلم (Al-Qalam)", "69. الحاقة (Al-Haqqah)", "70. المعارج (Al-Ma'arij)",
        "71. نوح (Nuh)", "72. الجن (Al-Jinn)", "73. المزمل (Al-Muzzammil)", "74. المدثر (Al-Muddathir)",
        "75. القيامة (Al-Qiyamah)", "76. الإنسان (Al-Insan)", "77. المرسلات (Al-Mursalat)", "78. النبأ (An-Naba')",
        "79. النازعات (An-Nazi'at)", "80. عبس (Abasa)", "81. التكوير (At-Takwir)", "82. الانفطار (Al-Infitar)",
        "83. المطففين (Al-Mutaffifin)", "84. الانشقاق (Al-Inshiqaq)", "85. البروج (Al-Buruj)", "86. الطارق (At-Tariq)",
        "87. الأعلى (Al-A'la)", "88. الغاشية (Al-Ghashiyah)", "89. الفجر (Al-Fajr)", "90. البلد (Al-Balad)",
        "91. الشمس (Ash-Shams)", "92. الليل (Al-Layl)", "93. الضحى (Ad-Duhaa)", "94. الشرح (Ash-Sharh)",
        "95. التين (At-Tin)", "96. العلق (Al-Alaq)", "97. القدر (Al-Qadr)", "98. البينة (Al-Bayyinah)",
        "99. الزلزلة (Az-Zalzalah)", "100. العاديات (Al-Adiyat)", "101. القارعة (Al-Qari'ah)", "102. التكاثر (At-Takathur)",
        "103. العصر (Al-Asr)", "104. الهمزة (Al-Humazah)", "105. الفيل (Al-Fil)", "106. قريش (Quraysh)",
        "107. الماعون (Al-Ma'un)", "108. الكوثر (Al-Kawthar)", "109. الكافرون (Al-Kafirun)", "110. النصر (An-Nasr)",
        "111. المسد (Al-Masad)", "112. الإخلاص (Al-Ikhlas)", "113. الفلق (Al-Falaq)", "114. الناس (An-Nas)"
    ];

    try {
        // Prepare rows without empty headers/descriptions
        const createRows = (start, end) => {
            return surahs.slice(start, end).map((s, i) => ({
                title: s, // Only title is mandatory and safe
                id: `${settings.prefix}quransura ${start + i + 1}`
            }));
        };

        const sections = [
            {
                title: "من 1 إلى 30",
                highlight_label: "الأول",
                rows: createRows(0, 30)
            },
            {
                title: "من 31 إلى 60",
                highlight_label: "الثاني",
                rows: createRows(30, 60)
            },
            {
                title: "من 61 إلى 90",
                highlight_label: "الثالث",
                rows: createRows(60, 90)
            },
            {
                title: "من 91 إلى 114",
                highlight_label: "الرابع",
                rows: createRows(90, 114)
            }
        ];

        const listMessage = {
            title: "اضغط هنا لاختيار السورة",
            sections
        };

        const msgContent = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `🕌 *أهلاً بك في قسم القرآن الكريم*\n\nيرجى الضغط على الزر أسفله لاختيار السورة 👇`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: `乂 ${settings.botName}`
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: "القرآن الكريم",
                            subtitle: "القائمة الكاملة",
                            hasMediaAttachment: false
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    "name": "single_select",
                                    "buttonParamsJson": JSON.stringify(listMessage)
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: msg });

        await sock.relayMessage(chatId, msgContent.message, { messageId: msgContent.key.id });

    } catch (e) {
        console.error("Error sending quran list:", e);
        await sock.sendMessage(chatId, { text: "❌ حدث خطأ في عرض القائمة." });
    }
}

module.exports = quranCommand;
