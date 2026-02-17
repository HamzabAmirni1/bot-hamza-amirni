const { sendWithChannelButton } = require('../lib/channelButton');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { t } = require('../lib/language');
const settings = require('../settings');

async function bookCommand(sock, chatId, message, args, commands, userLang) {
    const query = args.join(' ').trim();

    if (!query) {
        const helpMsg = t('book.help', { prefix: settings.prefix, botName: t('common.botName', {}, userLang) }, userLang);
        return await sendWithChannelButton(sock, chatId, helpMsg, message, {}, userLang);
    }

    // 1. Check if it's a direct URL download
    const generalUrlPattern = /https?:\/\/[^\s]+/i;
    if (generalUrlPattern.test(query)) {
        const directLink = query.match(generalUrlPattern)[0];
        try {
            await sock.sendMessage(chatId, { react: { text: "📥", key: message.key } });
            await sock.sendMessage(chatId, { text: t('book.url_wait', {}, userLang) }, { quoted: message });

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            const tempFile = path.join(tempDir, `book_${Date.now()}.pdf`);

            const response = await axios({
                url: directLink,
                method: 'GET',
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 180000
            });

            const writer = fs.createWriteStream(tempFile);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: `book_${Date.now()}.pdf`,
                mimetype: "application/pdf",
                caption: t('book.download_success', { botName: t('common.botName', {}, userLang) }, userLang)
            }, { quoted: message });

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            return await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        } catch (e) {
            console.error('Book Direct Download Error:', e);
            // Continue to search links if direct download fails
        }
    }

    // 2. Automatic Search and Download
    await sock.sendMessage(chatId, { react: { text: "🔍", key: message.key } });
    try {
        const downloadUrl = await findPdfInGoogle(query);
        if (downloadUrl) {
            await sock.sendMessage(chatId, { text: t('book.found_direct', {}, userLang) }, { quoted: message });

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            const tempFile = path.join(tempDir, `search_${Date.now()}.pdf`);

            const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream', timeout: 120000 });
            const writer = fs.createWriteStream(tempFile);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: `${query}.pdf`,
                mimetype: "application/pdf",
                caption: t('book.search_success', { query, botName: t('common.botName', {}, userLang) }, userLang)
            }, { quoted: message });

            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            return await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        }
    } catch (e) {
        console.error('Book automatic search error:', e);
    }

    // 3. Fallback: Search links for popular book sites
    const searchLinks = [
        { name: 'Google Books', url: `https://www.google.com/search?q=${encodeURIComponent(query + ' filetype:pdf')}` },
        { name: 'LibGen', url: `https://libgen.is/search.php?req=${encodeURIComponent(query)}` },
        { name: 'Noor-Book', url: `https://www.noor-book.com/search?q=${encodeURIComponent(query)}` },
        { name: 'Kotobati', url: `https://www.kotobati.com/search?q=${encodeURIComponent(query)}` }
    ];

    let bookMsg = t('book.search_results', { query }, userLang);

    searchLinks.forEach(link => {
        bookMsg += t('book.link_item', { name: link.name, url: link.url }, userLang);
    });

    bookMsg += t('book.tip', {}, userLang);
    bookMsg += `⚔️ ${t('common.botName', {}, userLang)}`;

    await sock.sendMessage(chatId, { text: bookMsg }, { quoted: message });
}

async function findPdfInGoogle(query) {
    try {
        const searchTerms = query.toLowerCase().includes('filetype:pdf') ? query : query + " filetype:pdf";
        const response = await axios.get(`https://api.siputzx.my.id/api/searching/google?query=${encodeURIComponent(searchTerms)}`);
        const results = response.data?.results || response.data?.data;
        if (results && results.length > 0) {
            for (const res of results) {
                if (res.link.toLowerCase().endsWith('.pdf')) return res.link;
            }
            return results[0].link;
        }
    } catch (e) { return null; }
}

module.exports = bookCommand;
