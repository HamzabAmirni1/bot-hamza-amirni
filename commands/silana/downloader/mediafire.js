/*
  Feature : MediaFire Downloader (Send File Directly)
  Author  : AlfiDev (adapted)
  Support : Single File & Folder
  Note    : Auto send file if <= 100MB, otherwise send link
  modified: by noureddine ouafy 
*/
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36"

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

/* ================= UTILS ================= */

const getDirectDownload = async (filePageUrl) => {
  try {
    const res = await axios.get(filePageUrl, {
      headers: { "User-Agent": UA },
    })
    const $ = cheerio.load(res.data)
    return $("#downloadButton").attr("href") || null
  } catch {
    return null
  }
}

const downloadFile = async (url) => {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { "User-Agent": UA },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })
  return Buffer.from(res.data)
}

/* ================= MEDIAFIRE ================= */

const scrapeSingleFile = async (fileUrl) => {
  const quickkey = fileUrl.match(/file\/([^/]+)/)?.[1]
  if (!quickkey) return []

  try {
    const res = await axios.get(fileUrl, {
      headers: { "User-Agent": UA },
    })
    const $ = cheerio.load(res.data)
    
    // Find the download button
    const btn = $("#downloadButton")
    if (!btn.length) return []
    
    const downloadUrl = btn.attr("href") || ""
    
    // Get filename
    let filename = $('meta[property="og:title"]').attr('content') || ""
    if (!filename && downloadUrl) {
      try {
        const u = new URL(downloadUrl)
        filename = decodeURIComponent(u.pathname.split('/').pop())
      } catch {}
    }
    filename = filename.trim() || "mediafire-file"
    
    // Get size
    let size = 0
    const sizeText = btn.text() || ""
    const sizeMatch = sizeText.match(/\(([0-9.]+\s*([KMGT]?)B)\)/i)
    if (sizeMatch) {
      const num = parseFloat(sizeMatch[1])
      const unit = sizeMatch[2] ? sizeMatch[2].toUpperCase() : 'B'
      if (unit === 'K') size = num * 1024
      else if (unit === 'M') size = num * 1024 * 1024
      else if (unit === 'G') size = num * 1024 * 1024 * 1024
      else if (unit === 'T') size = num * 1024 * 1024 * 1024 * 1024
      else size = num
    }

    return [
      {
        filename,
        size,
        quickkey,
        filePageUrl: fileUrl,
        directUrl: downloadUrl
      },
    ]
  } catch (e) {
    console.error('[Mediafire Scraper] Error scraping single file:', e.message)
    return []
  }
}

const getFolderFiles = async (folderKey) => {
  let files = []
  let chunk = 1

  while (true) {
    const r = crypto.randomBytes(4).toString("hex")
    const url = `https://www.mediafire.com/api/1.4/folder/get_content.php?r=${r}&content_type=files&filter=all&order_by=name&order_direction=asc&chunk=${chunk}&version=1.5&folder_key=${folderKey}&response_format=json`

    const res = await axios.get(url, { headers: { "User-Agent": UA } })
    const content = res.data?.response?.folder_content
    const list = content?.files || []

    for (const f of list) {
      files.push({
        filename: f.filename,
        size: Number(f.size),
        quickkey: f.quickkey,
        filePageUrl: `https://www.mediafire.com/file/${f.quickkey}/file`,
      })
    }

    if (content?.more_chunks === "no") break
    chunk++
  }

  return files
}

const getAllItems = async (url) => {
  if (url.includes("/folder/")) {
    const key = url.match(/folder\/([^/]+)/)?.[1]
    return key ? await getFolderFiles(key) : []
  }

  if (url.includes("/file/")) {
    return await scrapeSingleFile(url)
  }

  return []
}

/* ================= HANDLER ================= */

let handler = async (m, { conn, args }) => {
  if (!args[0])
    return conn.reply(
      m.chat,
      "❌ Usage:\n.mediafire <mediafire link>",
      m
    )

  await conn.reply(m.chat, "⏳ Processing MediaFire link...", m)

  try {
    const items = await getAllItems(args[0])
    if (!items.length)
      return conn.reply(m.chat, "❌ No files found.", m)

    for (const item of items) {
      const direct = item.directUrl || await getDirectDownload(item.filePageUrl)
      if (!direct) {
        await conn.reply(m.chat, `❌ Failed to get download link for: ${item.filename}`, m)
        continue
      }

      // Try to get exact size and name from HEAD request
      let size = item.size || 0
      let filename = item.filename || "mediafire-file"
      try {
        const head = await axios.head(direct, {
          headers: { "User-Agent": UA },
          timeout: 5000
        })
        if (head.headers['content-length']) {
          size = Number(head.headers['content-length'])
        }
        if (head.headers['content-disposition']) {
          const disposition = head.headers['content-disposition']
          const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
          if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1])
          }
        }
      } catch (e) {
        console.error('[Mediafire HEAD error]:', e.message)
      }

      // Fallback filename cleaning
      if (filename === "mediafire-file" && direct) {
        try {
          const u = new URL(direct)
          filename = decodeURIComponent(u.pathname.split('/').pop())
        } catch {}
      }

      // Ensure filename has clean formatting (replace + with space)
      filename = filename.replace(/\+/g, ' ')

      // ❌ File too large
      if (size > MAX_SIZE) {
        await conn.reply(
          m.chat,
          `⚠️ *File too large to send*\n\n📄 Name: ${filename}\n📦 Size: ${(size / 1024 / 1024).toFixed(
            2
          )} MB\n🔗 Download:\n${direct}`,
          m
        )
        continue
      }

      // ✅ Send file
      const buffer = await downloadFile(direct)

      await conn.sendFile(
        m.chat,
        buffer,
        filename,
        `📦 MediaFire File\n\n📄 Name: ${filename}\n📦 Size: ${(size / 1024 / 1024).toFixed(
          2
        )} MB`,
        m
      )
    }
  } catch (e) {
    console.error('[Mediafire handler error]:', e)
    conn.reply(m.chat, "❌ Error while downloading MediaFire file.", m)
  }
}

/* ================= META ================= */

handler.help = ["mediafire"]
handler.command = ["mediafire"]
handler.tags = ["downloader"]
handler.limit = true
module.exports = handler
