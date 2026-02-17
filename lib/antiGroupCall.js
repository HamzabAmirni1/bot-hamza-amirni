const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, '../data/anti-group-call.json');

// Load config
function loadConfig() {
    try {
        if (fs.existsSync(configFile)) {
            return JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading anti-group-call config:', error);
    }
    return {};
}

// Save config
function saveConfig(config) {
    try {
        const dataDir = path.dirname(configFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving anti-group-call config:', error);
        return false;
    }
}

// Enable anti-group-call for a group
function enableAntiGroupCall(groupId) {
    const config = loadConfig();
    config[groupId] = {
        enabled: true,
        violators: []
    };
    return saveConfig(config);
}

// Disable anti-group-call for a group
function disableAntiGroupCall(groupId) {
    const config = loadConfig();
    delete config[groupId];
    return saveConfig(config);
}

// Check if anti-group-call is enabled
function isAntiGroupCallEnabled(groupId) {
    const config = loadConfig();
    return config[groupId]?.enabled || false;
}

// Add violator
function addViolator(groupId, userId) {
    const config = loadConfig();
    if (!config[groupId]) {
        config[groupId] = { enabled: true, violators: [] };
    }
    if (!config[groupId].violators.includes(userId)) {
        config[groupId].violators.push(userId);
        saveConfig(config);
    }
}

// Get violators list
function getViolators(groupId) {
    const config = loadConfig();
    return config[groupId]?.violators || [];
}

// Handle group call detection
async function handleGroupCall(sock, groupId, callerId) {
    console.log(`📞 Group call detected - Group: ${groupId}, Caller: ${callerId}`);

    try {
        if (!isAntiGroupCallEnabled(groupId)) {
            console.log(`⏭️ Anti-group-call disabled for ${groupId}`);
            return;
        }

        console.log(`✅ Anti-group-call enabled for ${groupId}, processing...`);

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(groupId);
        const participants = groupMetadata.participants;

        // Check if caller is admin - DON'T kick admins
        const callerParticipant = participants.find(p => p.id === callerId);
        if (callerParticipant && (callerParticipant.admin === 'admin' || callerParticipant.admin === 'superadmin')) {
            console.log(`⚠️ Skipping kick for admin who started group call: ${callerId}`);

            // Just send warning to admin
            await sock.sendMessage(groupId, {
                text: `⚠️ *تحذير للمشرف*

👤 @${callerId.split('@')[0]}
🚫 مكالمات المجموعة ممنوعة!

💡 كمشرف، لن يتم طردك، لكن يرجى عدم فتح مكالمات.`,
                mentions: [callerId]
            });
            return;
        }

        try {
            // Send warning
            await sock.sendMessage(groupId, {
                text: `⚠️ *تحذير: طرد تلقائي*

👤 المستخدم: @${callerId.split('@')[0]}
🚫 السبب: فتح مكالمة جماعية في المجموعة

⏰ سيتم طرده الآن...`,
                mentions: [callerId]
            });

            // Wait
            await new Promise(r => setTimeout(r, 2000));

            // Kick
            await sock.groupParticipantsUpdate(groupId, [callerId], 'remove');

            // Add to violators
            addViolator(groupId, callerId);

            console.log(`🚫 Kicked ${callerId} from ${groupId} for starting group call`);

            // Confirmation
            await sock.sendMessage(groupId, {
                text: `✅ تم طرد المستخدم بنجاح!

🚫 مكالمات المجموعة ممنوعة.
💡 المشرفين محميون من الطرد.`
            });

        } catch (error) {
            console.error(`Error kicking user from ${groupId}:`, error.message);

            // Send error message if kick failed
            await sock.sendMessage(groupId, {
                text: `❌ فشل طرد المستخدم!

⚠️ تأكد من أن البوت مشرف في المجموعة.`
            }).catch(() => { });
        }

    } catch (error) {
        console.error('Error in handleGroupCall:', error);
    }
}

module.exports = {
    enableAntiGroupCall,
    disableAntiGroupCall,
    isAntiGroupCallEnabled,
    handleGroupCall,
    getViolators,
    loadConfig
};
