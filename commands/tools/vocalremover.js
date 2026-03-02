async function vocalRemoverCommand(sock, chatId, msg, args) {
    const { vocalRemove } = require('../../lib/vocalRemover');
    const { sendWithChannelButton } = require('../../lib/channelButton');
    const settings = require('../../settings');

    console.log(`[VocalRemover] Triggered by ${msg.key.remoteJid}`);

    // Robust Quoted Message Resolution
    let quoted = msg.quoted ? msg.quoted : msg;
    // Check if it's a viewOnce message and unwrap it if needed (though handleMessage usually does this)
    // Also support older Baileys structures if needed
    let mime = (quoted.msg || quoted).mimetype || '';

    console.log(`[VocalRemover] Mime detected: ${mime}`);

    if (!/audio/.test(mime) && !/video/.test(mime)) {
        console.log('[VocalRemover] No audio/video found. Sending help/usage.');
        const helpMsg = `🎤 *عازل الصوت (Vocal Remover)* 🎤

🔹 *الاستخدام:*
رد على شي أوديو ولا فيديو بهاد الكوموند:
${settings.prefix}3azlsawt
أو
${settings.prefix}hazf-sawt

💡 البوت كايخدم بالذكاء الاصطناعي باش يحيد الموسيقى ويخلي غير صوت المغني، ولا العكس.
⚠️ نصيحة: من الأحسن المقطع ما يفوتش 2 دقايق باش تخرج النتيجة ناضية وبزربة.

⚔️ ${settings.botName}`;
        return await sendWithChannelButton(sock, chatId, helpMsg, msg);
    }

    try {
        await sendWithChannelButton(sock, chatId, '⏳ *جاري معالجة المقطع وفصل الصوت عن الموسيقى...*\nيرجى التحلي بالصبر، هذه العملية قد تستغرق دقيقة أو أكثر.', msg);

        // React with 🎧
        await sock.sendMessage(chatId, { react: { text: "🎧", key: msg.key } });

        console.log('[VocalRemover] Downloading media...');
        const media = await (quoted.download ? quoted.download() : sock.downloadMediaMessage(quoted));
        if (!media) throw new Error("تعذر تحميل المقطع");
        console.log(`[VocalRemover] Media downloaded. Size: ${media.length} bytes`);

        console.log('[VocalRemover] Sending to API...');
        const { vocal_path, instrumental_path } = await vocalRemove(media);
        console.log(`[VocalRemover] API Success. Vocal: ${vocal_path}, Inst: ${instrumental_path}`);

        if (!vocal_path || !instrumental_path) {
            throw new Error("فشل استخراج الروابط من الخادم.");
        }

        // Send Vocals
        await sock.sendMessage(chatId, {
            audio: { url: vocal_path },
            mimetype: 'audio/mpeg',
            fileName: 'Vocals.mp3',
            caption: '🎤 *صوت المغني فقط (Vocals)*'
        }, { quoted: msg });

        // Send Instrumental
        await sock.sendMessage(chatId, {
            audio: { url: instrumental_path },
            mimetype: 'audio/mpeg',
            fileName: 'Instrumental.mp3',
            caption: '🎸 *الموسيقى فقط (Instrumental)*'
        }, { quoted: msg });

        // React with check
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        console.log('[VocalRemover] Completed successfully.');

    } catch (error) {
        console.error('[VocalRemover] Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sendWithChannelButton(sock, chatId, `❌ فشلت العملية.\n⚠️ السبب: ${error.message || 'خطأ في الخادم أو المقطع كبير جداً'}`, msg);
    }
}

module.exports = vocalRemoverCommand;
