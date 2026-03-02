const fs = require('fs');
const path = require('path');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

const khatmFile = path.join(__dirname, '../data/quran-khatm.json');

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(khatmFile))) {
    fs.mkdirSync(path.dirname(khatmFile), { recursive: true });
}

const juzToSurahs = [
    "الفاتحة - البقرة (141)", "البقرة (142 - 252)", "البقرة (253) - آل عمران (92)", "آل عمران (93) - النساء (23)",
    "النساء (24 - 147)", "النساء (148) - المائدة (81)", "المائدة (82) - الأنعام (110)", "الأنعام (111) - الأعراف (87)",
    "الأعراف (88) - الأنفال (40)", "الأنفال (41) - التوبة (92)", "التوبة (93) - هود (5)", "هود (6) - يوسف (52)",
    "يوسف (53) - إبراهيم (52)", "الحجر (1) - النحل (128)", "الإسراء (1) - الكهف (74)", "الكهف (75) - طه (135)",
    "الأنبياء (1) - الحج (78)", "المؤمنون (1) - الفرقان (20)", "الفرقان (21) - النمل (55)", "النمل (56) - العنكبوت (45)",
    "العنكبوت (46) - الأحزاب (30)", "الأحزاب (31) - يس (27)", "يس (28) - الزمر (31)", "الزمر (32) - فصلت (46)",
    "فصلت (47) - الجاثية (37)", "الأحقاف (1) - الذاريات (30)", "الذاريات (31) - الحديد (29)", "المجادلة (1) - التحريم (12)",
    "الملك (1) - المرسلات (50)", "النبأ (1) - الناس (6)"
];

function loadKhatmData() {
    if (!fs.existsSync(khatmFile)) {
        return {
            currentKhatm: 1,
            parts: Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                surahs: juzToSurahs[i],
                status: 'available', // available, reading, completed
                user: null,
                userName: null,
                time: null
            })),
            history: []
        };
    }
    try {
        const data = JSON.parse(fs.readFileSync(khatmFile));
        // Add surahs to old data if missing
        data.parts.forEach((p, i) => { if (!p.surahs) p.surahs = juzToSurahs[i]; });
        return data;
    } catch (e) {
        return { currentKhatm: 1, parts: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, surahs: juzToSurahs[i], status: 'available', user: null, userName: null, time: null })), history: [] };
    }
}

function saveKhatmData(data) {
    fs.writeFileSync(khatmFile, JSON.stringify(data, null, 2));
}

async function khatmCommand(sock, chatId, msg, args, commands, userLang) {
    let data = loadKhatmData();
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || sender.split('@')[0];
    const subCommand = args[0] ? args[0].toLowerCase() : 'view';

    if (subCommand === 'view' || subCommand === 'عرض') {
        let text = `📖 *ختمة القرآن الكريم المشتركة* 📖\n`;
        text += `✨ الختمة رقم: *${data.currentKhatm}*\n\n`;

        let completed = data.parts.filter(p => p.status === 'completed').length;
        let reading = data.parts.filter(p => p.status === 'reading').length;

        text += `✅ المكتملة: *${completed}/30*\n`;
        text += `⏳ قيد القراءة: *${reading}*\n\n`;
        text += `📌 *قائمة الأجزاء:*\n`;

        data.parts.forEach(p => {
            let statusIcon = p.status === 'completed' ? '✅' : (p.status === 'reading' ? '⏳' : '⚪');
            let info = p.user ? ` (@${p.userName || p.user.split('@')[0]})` : '';
            text += `${statusIcon} الجزء ${p.id}: ${p.surahs}${info}\n`;
        });

        text += `\n💡 *كيفية المشاركة:* \n`;
        text += `- لحجز جزء: *.khatm take [رقم الجزء]*\n`;
        text += `- لإتمام القراءة: *.khatm done [رقم الجزء]*\n`;
        text += `- لإلغاء الحجز: *.khatm cancel [رقم الجزء]*\n\n`;
        text += `⚔️ ${settings.botName}`;

        return await sendWithChannelButton(sock, chatId, text, msg);
    }

    if (subCommand === 'take' || subCommand === 'حجز') {
        const partIdx = parseInt(args[1]) - 1;
        if (isNaN(partIdx) || partIdx < 0 || partIdx > 29) {
            return sock.sendMessage(chatId, { text: "❌ يرجى إدخال رقم جزء صحيح (1-30)." }, { quoted: msg });
        }

        if (data.parts[partIdx].status !== 'available') {
            return sock.sendMessage(chatId, { text: `❌ هذا الجزء محجوز بالفعل من قبل @${data.parts[partIdx].userName || 'مستخدم آخر'}.`, mentions: [data.parts[partIdx].user] }, { quoted: msg });
        }

        // Check if user already has an active part they are reading
        const activePart = data.parts.find(p => p.user === sender && p.status === 'reading');
        if (activePart) {
            return sock.sendMessage(chatId, { text: `⚠️ لديك بالفعل الجزء ${activePart.id} قيد القراءة. يرجى إتمامه أولاً أو إلغاء حجزه.` }, { quoted: msg });
        }

        data.parts[partIdx].status = 'reading';
        data.parts[partIdx].user = sender;
        data.parts[partIdx].userName = senderName;
        data.parts[partIdx].time = Date.now();

        saveKhatmData(data);
        return sock.sendMessage(chatId, { text: `✅ تم حجز الجزء *${partIdx + 1}* بنجاح.\n📖 السور: *${data.parts[partIdx].surahs}*\nتقبل الله منك يا @${senderName}. ✨`, mentions: [sender] }, { quoted: msg });
    }

    if (subCommand === 'done' || subCommand === 'تم') {
        const partIdx = parseInt(args[1]) - 1;
        if (isNaN(partIdx) || partIdx < 0 || partIdx > 29) {
            return sock.sendMessage(chatId, { text: "❌ يرجى إدخال رقم جزء صحيح (1-30)." }, { quoted: msg });
        }

        if (data.parts[partIdx].user !== sender) {
            return sock.sendMessage(chatId, { text: "❌ لا يمكنك تأكيد إتمام جزء لم تقم بحجزه أنت." }, { quoted: msg });
        }

        data.parts[partIdx].status = 'completed';
        data.parts[partIdx].time = Date.now();

        // Check if Khatm is complete
        const allDone = data.parts.every(p => p.status === 'completed');
        if (allDone) {
            data.history.push({ khatm: data.currentKhatm, date: new Date().toISOString() });
            data.currentKhatm += 1;
            // Reset for next khatm
            data.parts.forEach(p => {
                p.status = 'available';
                p.user = null;
                p.userName = null;
                p.time = null;
            });
            saveKhatmData(data);
            return sock.sendMessage(chatId, { text: `🎉 *ما شاء الله!* 🎉\n\nلقد أتممنا الختمة رقم *${data.currentKhatm - 1}* بالكامل!\nتمت إعادة تهيئة الختمة الجديدة رقم *${data.currentKhatm}*.\n\nجعل الله ذلك في ميزان حسناتكم جميعاً. ✨` }, { quoted: msg });
        }

        saveKhatmData(data);
        return sock.sendMessage(chatId, { text: `✅ تقبل الله منك يا @${senderName}. تم تسجيل الجزء *${partIdx + 1}* كمكتمل. ✨`, mentions: [sender] }, { quoted: msg });
    }

    if (subCommand === 'cancel' || subCommand === 'إلغاء') {
        const partIdx = parseInt(args[1]) - 1;
        if (isNaN(partIdx) || partIdx < 0 || partIdx > 29) return;

        if (data.parts[partIdx].user !== sender) {
            return sock.sendMessage(chatId, { text: "❌ لا يمكنك إلغاء حجز لم تقم به." }, { quoted: msg });
        }

        data.parts[partIdx].status = 'available';
        data.parts[partIdx].user = null;
        data.parts[partIdx].userName = null;
        data.parts[partIdx].time = null;

        saveKhatmData(data);
        return sock.sendMessage(chatId, { text: `✅ تم إلغاء حجز الجزء *${partIdx + 1}*.` }, { quoted: msg });
    }
}

module.exports = khatmCommand;
module.exports.loadKhatmData = loadKhatmData;
