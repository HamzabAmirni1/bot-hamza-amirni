const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function carbonGuideCommand(sock, chatId, msg, args, commands, userLang) {
    const GUID = "GUID-CARBON-IMAGE-2025";

    const guideText = `📌 *Carbon Code Image Renderer*
**GUID:** ${GUID}

هاد الخاصية كتحول الكود ديالك لصورة احترافية ومنسقة (بحال Carbon ولا Ray.so). زوينة بزاف باش تبارطاجي الكود فمواقع التواصل ولا الشروحات.

🛠️ **كيفاش تخدمو (How to Use)**
• *عادي:*
\u200E${settings.prefix}carbon console.log("Hello World")

• *مع تحديد اللغة:*
\u200E${settings.prefix}carbon lang:python print("Hello from Python")

• *كود طويل (Multiple lines):*
\u200E${settings.prefix}carbon
function test(){
  return "OK"
}

🎨 *Theme الافتراضي:* Seti
🌐 *المصدر:* carbonara.solopov.dev

إذا واجهتي مشكلة، تأكد باللي الكود منسق مزيان وعاود جرب.

⚔️ ${settings.botName}`;

    return await sendWithChannelButton(sock, chatId, guideText, msg);
}

module.exports = carbonGuideCommand;
