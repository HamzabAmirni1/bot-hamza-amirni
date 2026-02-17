const handler = async (m, { conn }) => {
	if (!m.quoted) {
		return conn.sendMessage(m.chat, { text: "Reply to viewOnce message" }, { quoted: m });
	}

	const quoted = m.quoted;
	const isViewOnce = Object.keys(quoted?.message || {})
		.map((key) => quoted?.message[key]?.viewOnce)
		.includes(true);

	if (!isViewOnce) {
		return conn.sendMessage(m.chat, { text: "Reply to viewOnce message" }, { quoted: m });
	}

	const buffer = await m?.quoted?.download?.().catch(() => { });
	const media = m?.quoted?.mediaMessage[m?.quoted?.mediaType];
	const mtype = media?.mimetype;
	const isImage = /image/.test(mtype) ? "image" : "video";
	const isMedia = isImage || false;

	conn.sendMessage(
		m.chat,
		{
			...(isMedia && { [isMedia]: buffer }),
			...(media?.caption && { caption: media?.caption }),
		},
		{ quoted: m }
	);
};

handler.help = ["readviewonce"];
handler.tags = ["tools"];
handler.command = ["readviewonce", "rvo"];
handler.limit = true
module.exports = handler;
