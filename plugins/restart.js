const { spawn  } = require("child_process");
let handler = async (m, { conn, isROwner, text }) => {
  if (!process.send) throw "Dont: node main.js\nDo: node index.js";
  if (conn.user.jid == conn.user.jid) {
    await m.reply("🔁 جاري إعادة تشغيل البوت...\n المرجو الإنتظار  ");
    process.send("reset");
  } else throw "eh";
};

handler.help = ["restart"];
handler.tags = ["owner"];
handler.command = ["restart"];

handler.owner = true;

module.exports = handler;
