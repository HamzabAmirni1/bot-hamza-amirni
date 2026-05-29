const { tmpdir  } = require("os");
const path = require('path');
const { join  } = require('path');;
const { readdirSync,
  statSync,
  unlinkSync,
  existsSync,
  readFileSync,
  watch,
 } = require("fs");
let handler = async (m, { conn, usedPrefix: _p, __dirname, args }) => {
  conn.reply(m.chat, "Succes !", m);

  const tmp = [tmpdir(), join(__dirname, "../tmp")];
  const filename = [];
  tmp.forEach((dirname) =>
    readdirSync(dirname).forEach((file) => filename.push(join(dirname, file))),
  );
  return filename.map((file) => {
    const stats = statSync(file);
    unlinkSync(file);
  });
};
handler.help = ["clearwin"];
handler.tags = ["owner"];
handler.command = /^(clearwin)$/i;

handler.rowner = true;

module.exports = handler;
