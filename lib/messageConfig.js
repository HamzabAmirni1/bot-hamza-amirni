const settings = require('../settings');

// HIGH STABILITY CONFIG
// Simplified for maximum compatibility across all WhatsApp versions
const channelInfo = {
    contextInfo: {
        mentionedJid: [] // Empty mentionedJid is safe
    }
};

module.exports = { channelInfo };
