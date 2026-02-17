/**
 * Anti-Ban System helper to send messages safely
 */
const antiBanSystem = {
    /**
     * Sends a message with a small delay and error handling
     * @param {import('@whiskeysockets/baileys').WASocket} sock 
     * @param {string} jid 
     * @param {object} content 
     * @param {object} options 
     */
    safeSendMessage: async (sock, jid, content, options = {}) => {
        try {
            // Add a small random delay between 500ms and 1500ms
            const delay = Math.floor(Math.random() * 1000) + 500;
            await new Promise(resolve => setTimeout(resolve, delay));

            return await sock.sendMessage(jid, content, options);
        } catch (error) {
            console.error('SafeSendMessage Error:', error);
            throw error;
        }
    }
};

module.exports = { antiBanSystem };
