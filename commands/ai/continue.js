const { getSession, setSession, deleteSession } = require('../lib/quranSession');
const { sendWithChannelButton } = require('../lib/channelButton');
const axios = require('axios');
const { t } = require('../lib/language');
const settings = require('../settings');

async function continueCommand(sock, chatId, message, args, commands, userLang) {
    try {
        const session = getSession(chatId);

        if (!session) {
            return await sendWithChannelButton(sock, chatId, t('quran.no_session', {}, userLang), message);
        }

        const { surahNumber, name, englishName, lastIndex, totalAyahs } = session;

        if (lastIndex >= totalAyahs) {
            deleteSession(chatId);
            return await sendWithChannelButton(sock, chatId, t('quran.finished', {}, userLang), message);
        }

        const apiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}`;
        const response = await axios.get(apiUrl);

        if (!response.data || response.data.status !== 'OK') {
            return await sendWithChannelButton(sock, chatId, t('quran.fetch_error', {}, userLang), message);
        }

        const ayahs = response.data.data.ayahs || [];
        const ayahsPerPage = 35;
        const nextIndex = Math.min(lastIndex + ayahsPerPage, totalAyahs);

        let textParts = [];
        textParts.push(t('quran.continue_title', { name, englishName }, userLang));
        textParts.push('━━━━━━━━━━━━━━━━━━━━');

        for (let i = lastIndex; i < nextIndex; i++) {
            const a = ayahs[i];
            textParts.push(`${a.numberInSurah}. ${a.text}`);
        }

        if (nextIndex < totalAyahs) {
            textParts.push('\n━━━━━━━━━━━━━━━━━━━━');
            textParts.push(t('quran.hidden_ayahs', {}, userLang));
            textParts.push(t('quran.continue_tip', { prefix: settings.prefix }, userLang));

            // Update session
            setSession(chatId, {
                ...session,
                lastIndex: nextIndex
            });
        } else {
            textParts.push('\n━━━━━━━━━━━━━━━━━━━━');
            textParts.push(t('quran.surah_complete', {}, userLang));
            deleteSession(chatId);
        }

        const caption = textParts.join('\n');
        await sendWithChannelButton(sock, chatId, caption, message);

    } catch (error) {
        console.error('Error in continue command:', error);
        await sendWithChannelButton(sock, chatId, t('quran.error', {}, userLang), message);
    }
}

module.exports = continueCommand;
