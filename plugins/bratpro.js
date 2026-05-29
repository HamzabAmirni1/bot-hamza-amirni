const handler = async (m, { conn, text }) => {
  if (!text) return m.reply("Example: .bratpro silana ai");

  try {
    const caption = `Please choose the desired type:\n\n1. *Image 🖼️*\n2. *Video 🎥*`;
    await conn.sendMessage(
      m.chat,
      {
        text: caption,
        footer: "silana ai ~ By Moureddine ouafy",
        buttons: [
          {
            buttonId: `.brat ${text}`,
            buttonText: { displayText: "Image 🖼️" },
          },
          {
            buttonId: `.bratvideo ${text}`,
            buttonText: { displayText: "Video 🎥" },
          },
        ],
        viewOnce: true,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error(err);
    m.reply(`*An error occurred!* 😭\n${err.message || err}`);
  }
};

handler.help = ["bratpro"];
handler.tags = ["sticker"];
handler.command = ["bratpro"];
handler.limit = true;

module.exports = handler;
