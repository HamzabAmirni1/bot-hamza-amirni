const speed = require('performance-now');
const { spawn, exec, execSync } = require('child_process');

let handler = async (m, { conn }) => {
  let timestamp = speed();
  let latensi = speed() - timestamp;
  exec(`neofetch --stdout`, (error, stdout, stderr) => {
    let child = stdout.toString("utf-8");
    let ssd = child.replace(/Memory:/, "Ram:");
    m.reply(`${ssd}乂  *Speed* : ${latensi.toFixed(4)} _ms_`);
  });
};
handler.help = ["ping"];
handler.tags = ["tools"];
handler.command = ["ping", "speed"];
module.exports = handler;
