const { t } = require('../../lib/language');
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const { isOwner } = require('../../lib/ownerCheck');

module.exports = async (sock, chatId, msg, args, commands, userLang) => {
    try {
        if (!isOwner(msg)) {
            return;
        }

        const senderId = msg.key.participant || msg.key.remoteJid;
        const myNumber = sock.decodeJid(sock.user.id);

        let sessionsToCheck = [
            sock.sessionPath || './session'
        ];

        // Also check if they want ALL sessions
        if (args[0] === 'all') {
            sessionsToCheck = ['./session'];
            const sessionsRoot = path.join(__dirname, '../../sessions');
            if (fs.existsSync(sessionsRoot)) {
                fs.readdirSync(sessionsRoot).forEach(folder => {
                    const p = path.join(sessionsRoot, folder);
                    if (fs.statSync(p).isDirectory()) {
                        sessionsToCheck.push(p);
                    }
                });
            }
        }

        let sentCount = 0;

        for (const sPath of sessionsToCheck) {
            const credsFile = path.join(sPath, 'creds.json');
            if (fs.existsSync(credsFile)) {
                const credsData = fs.readFileSync(credsFile, 'utf-8');
                const base64Creds = Buffer.from(credsData).toString('base64');
                const sessionString = `Session~${base64Creds}`;
                const msgText = `✅ *كود الجلسة (Session Code) المستخرج من [${path.basename(sPath)}]*\n\nيرجى نسخه ووضعه في متغيّر البيئة \`SESSION_ID\` أو \`SESSION_2\` في Koyeb:\n\n\`\`\`${sessionString}\`\`\``;

                await sock.sendMessage(chatId, { text: msgText }, { quoted: msg });
                sentCount++;
            }
        }

        if (sentCount === 0) {
            await sock.sendMessage(chatId, { text: `❌ لم يتم العثور على أي ملفات جلسة (creds.json) مربوطة حالياً.` }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in getsession command:', error);
        await sock.sendMessage(chatId, { text: t('common.error', {}, userLang) });
    }
};
