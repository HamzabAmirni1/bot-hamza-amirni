// plugin from  Toxic-v2/xhclintohn thanks 🌟
// re-modified by instagram.com/noureddine_ouafy
// fixed buffer download - no stream hanging

const { downloadYouTube } = require('../../../lib/ytdl');
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

// Helper: download a URL to a Buffer
async function fetchBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    httpsAgent: agent,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  return Buffer.from(res.data);
}

// Search YouTube and get a watch URL using yts
async function searchYouTube(query) {
  // Try a simple YT search API
  try {
    const res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`,
      { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const match = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
  } catch (_) {}

  // Fallback: nexray search only (no download)
  try {
    const res = await axios.get(
      `https://api.nexray.web.id/downloader/ytplay?q=${encodeURIComponent(query)}`,
      { timeout: 15000 }
    );
    const d = res.data;
    if (d?.result?.url) return d.result.url;
    if (d?.result?.download_url) return null; // already has audio
  } catch (_) {}

  return null;
}

let handler = async (m, { conn, text }) => {

  // ╭─────────────────────────────────────────╮
  // │           GUIDE / دليل الاستخدام         │
  // ╰─────────────────────────────────────────╯
  //
  // 🎵 PLAY - YouTube Audio Downloader
  // Usage: .play <song name or YouTube URL>

  try {
    const query = text ? text.trim() : '';

    if (!query) {
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 You forgot to type something!\n` +
        `├ Give me a song name OR a YouTube link.\n` +
        `├ Example: .play funk universo\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 نسيتي تكتب شي!\n` +
        `├ عطيني اسم الأغنية أو رابط يوتيوب.\n` +
        `├ مثال: .play صوت الحرية\n` +
        `╰──────────────────☉`
      );
    }

    await conn.sendMessage(m.chat, { react: { text: '⌛', key: m.key } });

    // Detect if it's already a YouTube link
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    let youtubeUrl = ytRegex.test(query) ? query : null;

    // If not a direct link, search YouTube
    if (!youtubeUrl) {
      console.log(`[play.js] Searching YouTube for: "${query}"`);
      youtubeUrl = await searchYouTube(query);
    }

    if (!youtubeUrl) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 No results found for: "${query}"\n` +
        `├ Try a different song name or link.\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 ما لقيناش نتيجة لـ: "${query}"\n` +
        `├ جرب اسم أغنية آخر أو رابط مختلف.\n` +
        `╰──────────────────☉`
      );
    }

    console.log(`[play.js] Downloading audio from: ${youtubeUrl}`);

    // Download via downloadYouTube helper (mp3 mode)
    const result = await downloadYouTube(youtubeUrl, 'mp3');

    if (!result || !result.downloadUrl) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 Download failed. Try again later.\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 فشل التحميل. حاول مرة أخرى.\n` +
        `╰──────────────────☉`
      );
    }

    const { downloadUrl, title: songTitle, thumbnail } = result;
    const filename = (songTitle || query).replace(/[<>:"/\\|?*]/g, '_');

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    console.log(`[play.js] Fetching audio buffer from: ${downloadUrl}`);

    // Download audio as buffer (prevents Baileys stream hang)
    let audioBuffer;
    try {
      audioBuffer = await fetchBuffer(downloadUrl);
    } catch (bufErr) {
      console.error('[play.js] Buffer fetch failed:', bufErr.message);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 Failed to load the audio file. Try again.\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 تعذر تحميل الملف الصوتي. حاول مرة أخرى.\n` +
        `╰──────────────────☉`
      );
    }

    // Fetch thumbnail as buffer (prevents Baileys external URL issues)
    let thumbBuffer = null;
    if (thumbnail) {
      try {
        thumbBuffer = await fetchBuffer(thumbnail);
      } catch (_) {
        thumbBuffer = null;
      }
    }

    // Build contextInfo with thumbnail if available
    const contextInfo = thumbBuffer ? {
      externalAdReply: {
        title: (songTitle || query).substring(0, 60),
        body: `Silana Bot 🎵`,
        thumbnail: thumbBuffer,
        mediaType: 1,
        renderLargerThumbnail: true,
      }
    } : undefined;

    // Send audio as voice/audio message (buffer)
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${filename}.mp3`,
      contextInfo,
    }, { quoted: m });

    // Also send as downloadable document
    await conn.sendMessage(m.chat, {
      document: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${filename}.mp3`,
      caption:
        `╭───(    Silana Bot    )───\n` +
        `├───≫ 🎵 PLAY ≪───\n` +
        `├\n` +
        `├ *${songTitle || query}*\n` +
        `├─────────────────────\n` +
        `├ 🇬🇧 Enjoy your music!\n` +
        `├ 🇲🇦 استمتع بالموسيقى ديالك!\n` +
        `╰──────────────────☉`
    }, { quoted: m });

  } catch (error) {
    console.error('[play.js] Error:', error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    await m.reply(
      `╭───(    Silana Bot    )───\n` +
      `├───≫ ⚠️ ERROR ≪───\n` +
      `├\n` +
      `├ 🇬🇧 Something went wrong. Try again later.\n` +
      `├ Error: ${error.message}\n` +
      `├─────────────────────\n` +
      `├ 🇲🇦 وقع خطأ. حاول مرة أخرى.\n` +
      `╰──────────────────☉`
    );
  }
};

handler.help = ['play'];
handler.command = /^(play)?$/i;
handler.tags = ['downloader'];
handler.limit = true;
module.exports = handler;
