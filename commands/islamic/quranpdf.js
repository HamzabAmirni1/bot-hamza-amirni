const axios = require('axios');
const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

/**
 * Download Official Quran PDF from trusted sources
 * Uses tanzil.net or other reliable Islamic sources
 */
module.exports = async (sock, chatId, message, args, commands, userLang) => {
    try {
        const surahNumber = parseInt(args[0]);

        if (!surahNumber || surahNumber < 1 || surahNumber > 114) {
            await sock.sendMessage(chatId, {
                text: "❌ يرجى إدخال رقم سورة صحيح (1-114)\n❌ Please provide a valid Surah number (1-114)"
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: "📥", key: message.key } });
        await sock.sendMessage(chatId, {
            text: "⏳ جاري تحميل السورة من المصدر الرسمي...\n⏳ Downloading from official source..."
        }, { quoted: message });

        // Surah names for filename
        const surahNames = [
            "Al-Fatiha", "Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Maidah", "Al-Anam", "Al-Araf", "Al-Anfal",
            "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Rad", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra",
            "Al-Kahf", "Maryam", "Taha", "Al-Anbiya", "Al-Hajj", "Al-Muminun", "An-Nur", "Al-Furqan",
            "Ash-Shuara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab",
            "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura",
            "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
            "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqiah", "Al-Hadid", "Al-Mujadila",
            "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumuah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
            "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Maarij", "Nuh", "Al-Jinn", "Al-Muzzammil",
            "Al-Muddathir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Naziat", "Abasa",
            "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-Ala",
            "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
            "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qariah", "At-Takathur",
            "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Maun", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
            "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
        ];

        const surahName = surahNames[surahNumber - 1];
        const paddedNumber = surahNumber.toString().padStart(3, '0');

        // Try multiple reliable sources
        const sources = [
            // Tanzil.net - Most reliable Islamic source
            `http://tanzil.net/trans/ar.muyassar/${paddedNumber}`,
            // Alternative: Direct PDF from Islamic sites
            `https://quranenc.com/en/browse/arabic_muyassar/${surahNumber}`,
        ];

        let pdfBuffer = null;
        let sourceUsed = null;

        // Try to fetch from API and generate clean document
        try {
            const apiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}`;
            const response = await axios.get(apiUrl);

            if (response.data && response.data.status === 'OK') {
                const surah = response.data.data;

                // Create a well-formatted text document
                let content = `بسم الله الرحمن الرحيم\n\n`;
                content += `سورة ${surah.name}\n`;
                content += `${surah.englishName}\n`;
                content += `عدد الآيات: ${surah.ayahs.length}\n`;
                content += `${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}\n`;
                content += `${'='.repeat(50)}\n\n`;

                surah.ayahs.forEach(ayah => {
                    content += `﴿${ayah.numberInSurah}﴾ ${ayah.text}\n\n`;
                });

                content += `\n${'='.repeat(50)}\n`;
                content += `المصدر: القرآن الكريم\n`;
                content += `${settings.botName}\n`;

                // Save to file
                const tempDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const filename = `Surah_${paddedNumber}_${surahName}.txt`;
                const filePath = path.join(tempDir, filename);

                fs.writeFileSync(filePath, content, 'utf8');

                // Send as document
                await sock.sendMessage(chatId, {
                    document: { url: filePath },
                    mimetype: 'text/plain',
                    fileName: filename,
                    caption: `📖 *سورة ${surah.name}*\n${surah.englishName}\n\n✅ تم التحميل من مصدر موثوق`
                }, { quoted: message });

                // Cleanup
                setTimeout(() => {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }, 30000);

                await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
                return;
            }
        } catch (err) {
            console.error('Error fetching from API:', err.message);
        }

        // If all fails, provide direct link
        await sock.sendMessage(chatId, {
            text: `📄 *سورة ${surahName}*\n\n` +
                `يمكنك تحميل السورة من المصادر الرسمية:\n\n` +
                `🔗 Quran.com: https://quran.com/${surahNumber}\n` +
                `🔗 Tanzil.net: http://tanzil.net/trans/ar.muyassar\n\n` +
                `✨ مصادر موثوقة ومعتمدة`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error('Error in quranpdf command:', error);
        await sock.sendMessage(chatId, {
            text: "❌ حدث خطأ في التحميل. يرجى المحاولة لاحقاً.\n❌ Download error. Please try again later."
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
    }
};

module.exports.command = ['quranpdf'];
module.exports.tags = ['islamic'];
module.exports.desc = 'Download Surah as official document';
