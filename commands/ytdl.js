const axios = require('axios');
// plugin by hamza amirni

class YouTubeDownloader {
  constructor() {
    this.baseUrl = 'https://p.savenow.to'
    this.headers = {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://y2down.cc/',
      Origin: 'https://y2down.cc'
    }
  }

  async request(url, format) {
    try {
        const res = await axios.get(`${this.baseUrl}/ajax/download.php`, {
            params: {
              copyright: '0',
              format,
              url,
              api: 'dfcb6d76f2f6a9894gjkege8a4ab232222'
            },
            headers: this.headers
          })
      
          if (!res.data?.progress_url) return null
      
          return {
            progress: res.data.progress_url,
            title: res.data.info?.title || 'YouTube Video'
          }
    } catch (e) { return null; }
  }

  async wait(progressUrl) {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await axios.get(progressUrl, { headers: this.headers })
        if (res.data?.download_url) return res.data.download_url
      } catch (e) {}
      await new Promise(r => setTimeout(r, 2000))
    }
    return null
  }

  async download(url, format) {
    const req = await this.request(url, format)
    if (!req) return null

    const dl = await this.wait(req.progress)
    if (!dl) return null

    return {
      downloadUrl: dl,
      title: req.title
    }
  }
}

function cleanFileName(text) {
  return text
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const handler = async (sock, chatId, msg, args, commands, userLang) => {
  if (!args[0]) {
    return sock.sendMessage(chatId, { text: `
📥 *YouTube Downloader*

Download YouTube videos directly.

📌 *Usage*
.ytdl <youtube_url> [quality]

🎥 *Video qualities*
144, 240, 320, 480, 720, 1080, 1440, 4k
`.trim() }, { quoted: msg });
  }

  const url = args[0];
  const format = args[1] || '720';

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return sock.sendMessage(chatId, { text: '❌ Invalid YouTube URL' }, { quoted: msg });
  }

  await sock.sendMessage(chatId, { text: '⏳ Processing, please wait...' }, { quoted: msg });

  const ytdl = new YouTubeDownloader()
  const data = await ytdl.download(url, format)

  if (!data) throw '❌ Failed to download the video. Please try another quality.'

  try {
    const head = await axios.head(data.downloadUrl)
    const sizeMB = Number(head.headers['content-length'] || 0) / (1024 * 1024)

    if (sizeMB > 95) {
        return sock.sendMessage(chatId, { text: `❌ File is too large for WhatsApp (${sizeMB.toFixed(1)} MB)\n\n🔗 Download it here:\n${data.downloadUrl}` }, { quoted: msg });
    }

    const fileRes = await axios.get(data.downloadUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(fileRes.data)
    const safeTitle = cleanFileName(data.title)

    await sock.sendMessage(chatId, {
      document: buffer,
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`
    }, { quoted: msg });
  } catch (e) {
    sock.sendMessage(chatId, { text: `❌ Error: ${e.message}` }, { quoted: msg });
  }
}

module.exports = handler;
