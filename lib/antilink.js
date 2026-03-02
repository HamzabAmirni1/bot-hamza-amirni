const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilink, incrementWarningCount, resetWarningCount } = require('./index');
const isAdminHelper = require('./isAdmin');
const { isOwner } = require('./ownerCheck');

/**
 * Checks if a string contains a URL.
 */
function containsURL(str) {
	const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
	const waLinkRegex = /chat\.whatsapp\.com\/[a-zA-Z0-9]{20,25}/i;
	return urlRegex.test(str) || waLinkRegex.test(str);
}

/**
 * Handles the Antilink functionality for group chats.
 */
async function Antilink(msg, sock) {
	const chatId = msg.key.remoteJid;
	if (!chatId.endsWith('@g.us')) return;

	let messageText = msg.message?.conversation ||
		msg.message?.extendedTextMessage?.text ||
		msg.message?.imageMessage?.caption ||
		msg.message?.videoMessage?.caption || '';

	if (!messageText || typeof messageText !== 'string') return;

	// Skip commands (messages starting with prefix)
	if (messageText.startsWith('.')) return;

	if (!containsURL(messageText)) return;

	const senderId = msg.key.participant || msg.key.remoteJid;
	if (!senderId) return;

	// Skip if sender is owner or bot itself
	const isOwnerUser = isOwner(msg);
	if (isOwnerUser || senderId.includes(sock.user.id.split(':')[0])) return;

	// Skip if sender is admin
	const adminStatus = await isAdminHelper(sock, chatId, senderId);
	if (adminStatus.isSenderAdmin) return;

	// Check if antilink is enabled for this group
	const antilinkConfig = await getAntilink(chatId, 'on');
	if (!antilinkConfig || !antilinkConfig.enabled) return;

	// Check if bot is admin (to take action)
	if (!adminStatus.isBotAdmin) return;

	const action = antilinkConfig.action || 'delete';

	try {
		// Delete message
		await sock.sendMessage(chatId, { delete: msg.key });

		switch (action) {
			case 'delete':
				await sock.sendMessage(chatId, {
					text: `⚠️ *تنبيه:* الروابط غير مسموحة هنا يا @${senderId.split('@')[0]}`,
					mentions: [senderId]
				});
				break;

			case 'kick':
				await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
				await sock.sendMessage(chatId, {
					text: `🚫 *تم طرد* @${senderId.split('@')[0]} لإرساله رابطاً.`,
					mentions: [senderId]
				});
				break;

			case 'warn':
				const warningCount = await incrementWarningCount(chatId, senderId);
				const MAX_WARNS = 3;
				if (warningCount >= MAX_WARNS) {
					await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
					await resetWarningCount(chatId, senderId);
					await sock.sendMessage(chatId, {
						text: `🚫 *تم طرد* @${senderId.split('@')[0]} بعد وصوله لـ ${MAX_WARNS} تحذيرات بسبب الروابط.`,
						mentions: [senderId]
					});
				} else {
					await sock.sendMessage(chatId, {
						text: `⚠️ *تحذير (${warningCount}/${MAX_WARNS}):* يا @${senderId.split('@')[0]}، الروابط ممنوعة هنا!`,
						mentions: [senderId]
					});
				}
				break;
		}
	} catch (error) {
		console.error('Error in Antilink action:', error);
	}
}

module.exports = { Antilink };