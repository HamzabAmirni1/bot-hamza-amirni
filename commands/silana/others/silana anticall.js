let _listenerRegistered = false;

let handler = async (m, { conn }) => {
  if (!_listenerRegistered) {
    _listenerRegistered = true;
    conn.ev.on("call", async (json) => {
      for (let id of json) {
        if (id.status === "offer") {
          let msg = await conn.sendMessage(id.from, {
            text: "`نعتذر، في الوقت الحالي لا يمكننا استقبال المكالمات، سواء كانت في مجموعة أو خاصة.\n\nإذا كنت بحاجة إلى مساعدة أو طلب  ميزة، يرجى مراسلة المالك. الاتصال بالبوتات ليس من الجيد  لانك تزعج صاحب البوت المرجو احترام سياسة استخدام البوتات سيتم حظرك حاليا حتى لا تعيد الكرة مجددا مع اي بوت كان`\n\n instagram.com/noureddine_ouafy\n لا تقل لي في الانستغرام ان البوت قام بحظرك لانني حذرتكم من الاتصال به 🥲",
          });
          conn.sendContact(id.from, global.owner, msg);
          await conn.rejectCall(id.id, id.from);
          await conn.updateBlockStatus(id.from, "block");
        }
      }
    });
    return m.reply("✅ Anti-call listener activated.");
  }
  m.reply("ℹ️ Anti-call listener is already active.");
};

handler.help = ['anticall'];
handler.command = ['anticall'];
handler.tags = ['owner'];
handler.rowner = true;
module.exports = handler;
