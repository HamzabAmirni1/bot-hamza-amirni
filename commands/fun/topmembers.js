const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

function loadMessageCounts() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        try {
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveMessageCounts(messageCounts) {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;

    saveMessageCounts(messageCounts);
}

async function topMembers(sock, chatId, msg) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'This command is only available in group chats.' }, { quoted: msg });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Get top 10 members

    if (sortedMembers.length === 0) {
        await sock.sendMessage(chatId, { text: 'No message activity recorded yet.' }, { quoted: msg });
        return;
    }

    let messageText = '🏆 *أكثر الأعضاء تفاعلاً:* \n\n';
    sortedMembers.forEach(([userId, count], index) => {
        messageText += `${index + 1}. @${userId.split('@')[0]} - ${count} رسالة\n`;
    });

    await sock.sendMessage(chatId, {
        text: messageText,
        mentions: sortedMembers.map(([userId]) => userId)
    }, { quoted: msg });
}

topMembers.incrementMessageCount = incrementMessageCount;
module.exports = topMembers;
