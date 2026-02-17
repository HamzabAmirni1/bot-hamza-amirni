const axios = require("axios");
const settings = require("../settings");
const { t } = require('../lib/language');
const { sendWithChannelButton } = require('../lib/channelButton');

async function scriptCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        // 1. Permission Check (Owner or Group Admin)
        let isAdmin = false;
        let isOwner = settings.ownerNumber.some(num => msg.sender.includes(num));

        if (msg.isGroup) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            const sender = participants.find(u => u.id === msg.sender);
            isAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
        }

        // If neither owner nor admin, redirect to contact info
        if (!isOwner && !isAdmin) {
            const contactMsg =
                `🚫 *حبيس أ عشيري!* هاد السكريبت ZIP راه خاص غير بـ *الأدمنز* والحكام ديال لكروبات. 🛡️⚔️\n\n` +
                `إلا كنتي مهتم وبغيتي حتى نتا تسيطر على لكروب ديالك وتخدم بهاد السكريبت، تواصل مع المطور (مول الشي) باش يعطيك البلان:\n\n` +
                `🤴 *إمبراطور البوت:* حمزة اعمرني\n` +
                `📱 *تواصل مباشرة:* https://wa.me/212624855939\n` +
                `📸 *الإنستغرام:* ${settings.instagram}\n` +
                `📢 *قناة الإمبراطورية:* ${settings.officialChannel}\n\n` +
                `دخل للقناة وتواصل مع الساط باش يوريك الطريق! 👑`;

            await sendWithChannelButton(sock, chatId, contactMsg, msg, {}, userLang);
            await sock.sendMessage(chatId, { react: { text: '🛡️', key: msg.key } });
            return;
        }

        // 2. Proceed for Admins/Owners
        await sock.sendMessage(chatId, { react: { text: '🔄', key: msg.key } });

        const repoUrl = "https://github.com/HamzabAmirni1/bot-hamza-amirni";
        const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;

        // Fetch repo details from GitHub API
        let repoStats = { stars: 0, forks: 0, updated: "Recently" };
        try {
            const { data: repo } = await axios.get("https://api.github.com/repos/HamzabAmirni1/bot-hamza-amirni");
            repoStats.stars = repo.stargazers_count;
            repoStats.forks = repo.forks_count;
            repoStats.updated = new Date(repo.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { /* Fallback */ }

        const caption =
            `🔱 *إمبراطورية حمزة اعمرني - السكريبت الرسمي* 🔱\n\n` +
            `أهلاً بك يا بطل (الأدمن)! هادا هو السكريبت ZIP اللي طلبتي باش تخدم بيه ف لكروبات ديالك. ⚔️💎\n\n` +
            `🚀 *معلومات المستودع:* \n` +
            `🔗 *رابط المشروع:* ${repoUrl}\n` +
            `🌟 *النجوم:* ${repoStats.stars} | 🔀 *الفوركس:* ${repoStats.forks}\n\n` +
            `✨ *آخر تحديثات الإمبراطورية (Imperial Updates):* \n` +
            `🔥 نظام القوائم الإمبراطورية المطور (.menu).\n` +
            `🔥 تفعيل زر القناة الرسمي (Voir la chaîne) بنسبة 100%.\n` +
            `🔥 مكاتب ذكاء اصطناعي مغربية متطورة.\n` +
            `🔥 نظام ألعاب Mega Game مدمج بالكامل.\n` +
            `🔥 طابع مغربي ضحوكي ف كاع الميساجات!\n\n` +
            `📦 *هاك السكريبت ZIP لتحت، تهلا فيه أ عشيري!* 👑`;

        await sendWithChannelButton(sock, chatId, caption, msg, {}, userLang);

        const { data: zipBuffer } = await axios.get(zipUrl, { responseType: "arraybuffer" });
        await sock.sendMessage(chatId, {
            document: Buffer.from(zipBuffer),
            fileName: "Hamza-Amirni-Script.zip",
            mimetype: "application/zip",
            caption: "📦 *السكريبت الكامل لـ إمبراطورية حمزة اعمرني (خاص بالأدمنز)*"
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error("Script command error:", err);
        await sock.sendMessage(chatId, { text: "❌ *مشكل ف جلب السكريبت أ عشيري.*" }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = scriptCommand;
