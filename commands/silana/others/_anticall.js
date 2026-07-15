const { WAMessageStubType } = require('@whiskeysockets/baileys');
const { format } = require('util');

const isNumber = (x) => typeof x === "number" && !isNaN(x);
const delay = (ms) =>
  isNumber(ms) &&
  new Promise((resolve) =>
    setTimeout(function () {
      clearTimeout(this);
      resolve();
    }, ms),
  );
exports.all = async function all(m) {
  if (m.fromMe && m.isBaileys) return !0;
  let text;
  let setting = global.db.data.settings[this.user.jid];
  if (!setting.antiCall) return;

  if (
    m.messageStubType ===
    (WAMessageStubType.CALL_MISSED_VOICE || WAMessageStubType.CALL_MISSED_VIDEO)
  ) {
    await this.reply(
      m.chat,
      "You were blocked by a bot because you violated bot rules\n\n*📮Do not call bots!*",
      null,
    );
    await delay(1000);
    await this.updateBlockStatus(m.chat, "block");
  }
}
