// plugin from  Toxic-v2/xhclintohn thanks 🌟
// re-modified by instagram.com/noureddine_ouafy
// fixed: buffer download + MP3 validation + safeSend pattern

const axios = require('axios');
const https = require('https');
const yts = require('yt-search');

const agent = new https.Agent({ rejectUnauthorized: false });

// ─── Safe send — never crashes if socket dropped during long download ──────────
async function safeSend(conn, chat, content, opts = {}) {
  try {
    return await conn.sendMessage(chat, content, opts);
  } catch (e) {
    if (e?.output?.statusCode === 428 || /connection closed/i.test(e?.message || '')) {
      console.warn('[play] Socket closed before send — skipping.');
    } else {
      console.error('[play] sendMessage error:', e?.message || e);
    }
    return null;
  }
}

// ─── Download URL to Buffer ───────────────────────────────────────────────────
async function fetchBuffer(url, referer) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    httpsAgent: agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      ...(referer ? { 'Referer': referer } : {})
    }
  });
  return Buffer.from(res.data);
}

// ─── Check if buffer is a real audio file (MP3 / OGG / M4A / OPUS) ───────────
function getAudioFormat(buf) {
  if (!buf || buf.length < 4) return null;
  const h = buf.slice(0, 4);
  // MP3: ID3 header OR MPEG sync bits
  if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) return 'mp3'; // ID3
  if (h[0] === 0xFF && (h[1] & 0xE0) === 0xE0) return 'mp3';           // MPEG sync
  // OGG / Opus
  if (h.toString('ascii') === 'OggS') return 'ogg';
  // RIFF WAV
  if (h.toString('ascii') === 'RIFF') return 'wav';
  // MP4 / M4A
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') return 'mp4';
  return null;
}

// ─── Fallback: nexray API (returns direct download_url + metadata) ─────────────
async function nexraySearch(query) {
  try {
    const res = await axios.get(
      `https://api.nexray.web.id/downloader/ytplay?q=${encodeURIComponent(query)}`,
      { timeout: 20000 }
    );
    const d = res.data;
    if (d?.status && d?.result?.download_url) return d.result;
  } catch (_) {}
  return null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
let handler = async (m, { conn, text }) => {
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

    await safeSend(conn, m.chat, { react: { text: '⌛', key: m.key } });

    // ── Step 1: Resolve YouTube URL via yt-search ──────────────────────────
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    let youtubeUrl = ytRegex.test(query) ? query : null;
    let videoTitle = query;
    let videoThumb = '';
    let videoDuration = '';

    if (!youtubeUrl) {
      console.log(`[play.js] yt-search: "${query}"`);
      try {
        const { videos } = await yts(query);
        if (videos && videos.length > 0) {
          const v = videos[0];
          youtubeUrl   = v.url;
          videoTitle   = v.title;
          videoThumb   = v.thumbnail;
          videoDuration = v.timestamp;
        }
      } catch (e) {
        console.error('[play.js] yt-search error:', e.message);
      }
    }

    if (!youtubeUrl) {
      await safeSend(conn, m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 No results found for: "${query}"\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 ما لقيناش نتيجة لـ: "${query}"\n` +
        `╰──────────────────☉`
      );
    }

    // ── Step 2: Get audio download URL ─────────────────────────────────────
    const { downloadYouTube } = require('../../../lib/ytdl');
    let downloadUrl = null;
    let referer = null;

    // Primary: our ytdl helper
    try {
      const res = await downloadYouTube(youtubeUrl, 'mp3');
      if (res && res.downloadUrl) {
        downloadUrl = res.downloadUrl;
        if (!videoTitle || videoTitle === query) videoTitle = res.title || videoTitle;
        if (!videoThumb) videoThumb = res.thumbnail || '';
      }
    } catch (e) {
      console.error('[play.js] downloadYouTube error:', e.message);
    }

    // Fallback: nexray API
    if (!downloadUrl) {
      console.log('[play.js] Fallback: nexray...');
      const nex = await nexraySearch(query);
      if (nex) {
        downloadUrl  = nex.download_url;
        videoTitle   = nex.title    || videoTitle;
        videoThumb   = nex.thumbnail || videoThumb;
        videoDuration = nex.duration  || videoDuration;
      }
    }

    if (!downloadUrl) {
      await safeSend(conn, m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 Download failed. Try again later.\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 فشل التحميل. حاول مرة أخرى.\n` +
        `╰──────────────────☉`
      );
    }

    await safeSend(conn, m.chat, { react: { text: '✅', key: m.key } });

    // ── Step 3: Download audio buffer ──────────────────────────────────────
    console.log(`[play.js] Fetching buffer: ${downloadUrl}`);
    let audioBuffer;
    try {
      audioBuffer = await fetchBuffer(downloadUrl, referer);
    } catch (e) {
      console.error('[play.js] Buffer fetch failed:', e.message);
      await safeSend(conn, m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(
        `╭───(    Silana Bot    )───\n` +
        `├ 🇬🇧 Failed to load audio. Try again.\n` +
        `├─────────────────────\n` +
        `├ 🇲🇦 تعذر تحميل الملف الصوتي.\n` +
        `╰──────────────────☉`
      );
    }

    if (!audioBuffer || audioBuffer.length < 1000) {
      console.error('[play.js] Buffer too small:', audioBuffer?.length);
      await safeSend(conn, m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(`╭───(    Silana Bot    )───\n├ 🇬🇧 File too small or empty.\n├ 🇲🇦 الملف فارغ أو صغير جداً.\n╰──────────────────☉`);
    }

    const fmt = getAudioFormat(audioBuffer);
    console.log(`[play.js] Buffer size: ${audioBuffer.length} bytes | format: ${fmt || 'unknown'}`);

    // ── Step 4: Thumbnail buffer ───────────────────────────────────────────
    let thumbBuffer = null;
    if (videoThumb) {
      try { thumbBuffer = await fetchBuffer(videoThumb); } catch (_) {}
    }

    const safeTitle = videoTitle.replace(/[<>:"/\\|?*]/g, '_');

    // ── Step 5: Send as audio message ──────────────────────────────────────
    await safeSend(conn, m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
      ptt: false,
      contextInfo: thumbBuffer ? {
        externalAdReply: {
          title: videoTitle.substring(0, 60),
          body: `Silana Bot 🎵${videoDuration ? ' • ' + videoDuration : ''}`,
          thumbnail: thumbBuffer,
          mediaType: 1,
          renderLargerThumbnail: true,
        }
      } : undefined,
    }, { quoted: m });

    // ── Step 6: Send as downloadable document ──────────────────────────────
    await safeSend(conn, m.chat, {
      document: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
      caption:
        `╭───(    Silana Bot    )───\n` +
        `├───≫ 🎵 PLAY ≪───\n` +
        `├\n` +
        `├ *${videoTitle}*\n` +
        (videoDuration ? `├ ⏱️ ${videoDuration}\n` : '') +
        `├─────────────────────\n` +
        `├ 🇬🇧 Enjoy your music!\n` +
        `├ 🇲🇦 استمتع بالموسيقى ديالك!\n` +
        `╰──────────────────☉`
    }, { quoted: m });

  } catch (error) {
    console.error('[play.js] Unhandled error:', error);
    await safeSend(conn, m.chat, { react: { text: '❌', key: m.key } });
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
