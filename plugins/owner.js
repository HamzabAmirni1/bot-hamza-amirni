const fetch = require("node-fetch")
let handler = async (m, { conn }) => {
  let caption = `
*「 معلومات عن صاحب البوت 」*\n\n
*Whatsapp channel:*\n https://whatsapp.com/channel/0029VaX4b6J7DAWqt3Hhu01A\n
*instagram:*\ninstagram.com/noureddine_ouafy

*youtube:*\nyoutube.com/@noureddineouafy2

*facebook page:*\nwww.facebook.com/profile.php?id=100063533185520

*script bot :* github.com/noureddineouafy

`.trim()
  m.reply(caption)
}
handler.help = ['owner']
handler.tags = ['infobot']
handler.command = /^(owner)$/i
handler.limit = false

module.exports = handler
