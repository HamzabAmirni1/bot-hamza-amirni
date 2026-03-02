const axios = require("axios");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../../settings');

const UA = "okhttp/5.3.2";
const FBASE = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyB8XaGLKyMR1t8jT_NSMhsVi0acvtGL0Vk";
const STS = "https://airbrush.com/core-api/v1/upload/sts";
const PUTU = "https://object.pixocial.com/pixbizstorage-temp/";
const PKEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1UFKuWoaZLOSpHr81wwv
phUO51oKeQiJ41A4ccaQz/QOEXzypl8uXGN/5isVJlW7Px1DPogY/jd5wro7h7nJ
7LVdowOyD7OTDScCW6A1T1ri1toNt/mROXNcbNAUtmNj1ZyR3g5ylJQNNDZgiN4u
iU6AxIs6xeQ57LQAL394NoEN1VdobRTfW2YQzHOhHqRDgt3w2hvtBLTj9PQEJf/8
hz6hS2G8qXQO1aKcdj89u4w3TiHH/kHzyLWflLbIyQaDC9XdcVhgiXHBM5pm0xEY
dMnqJFEOvL383ex0BNQSLK8tkNxyNbyOTyBDhMpipcQfaR62lAi7lpmSPtyVGS9m
XwIDAQAB
-----END PUBLIC KEY-----`;

const MODES = {
    anime: {
        styles: ["dreamAnime", "cartoon", "ghibby", "toon", "cleanLine"],
        creat: (src, style) => ({
            url: "https://airbrush.com/core-api/v1/anime/create",
            body: { styleName: style || "dreamAnime", source: src }
        }),
        query: tid => ({
            url: `https://airbrush.com/core-api/v1/anime/query/${tid}`
        }),
        result: d => d?.effectUrl,
        done: d => d?.status === "success",
        pending: d => d?.status === "pending"
    }
};

const hdr = (tok) => ({
    "User-Agent": UA,
    "x-anonymous-uid": tok,
    "Content-Type": "application/json",
    "x-tenant": "ab"
});

const wait = ms => new Promise(r => setTimeout(r, ms));

class Airbrush {
    constructor() {
        this.tok = null;
    }

    async _auth() {
        if (this.tok) return this.tok;
        const { data } = await axios.post(FBASE, { returnSecureToken: true }, { headers: { "User-Agent": UA } });
        this.tok = data?.idToken;
        return this.tok;
    }

    async _sts(tok) {
        const { data } = await axios.post(STS, { publicKey: PKEY }, { headers: hdr(tok) });
        return data?.client?.sessionToken;
    }

    async _put(buf, st) {
        const fname = `airbrush_${Date.now()}.jpg`;
        const url = `${PUTU}${fname}?x-id=PutObject`;
        await axios.put(url, buf, {
            headers: {
                "User-Agent": UA,
                "content-type": "image/jpeg",
                "x-amz-security-token": st
            }
        });
        return `${PUTU}${fname}`;
    }

    async _poll(tok, tid, mode) {
        const cfg = MODES[mode];
        const { url } = cfg.query(tid);

        for (let i = 0; i < 60; i++) {
            await wait(3000);
            const { data } = await axios.get(url, { headers: hdr(tok) });
            if (cfg.done(data)) return cfg.result(data);
            if (!cfg.pending(data)) throw new Error("Unexpected Airbrush status");
        }
        throw new Error("Airbrush processing timeout");
    }

    async generate(buffer, style) {
        const tok = await this._auth();
        const st = await this._sts(tok);
        const src = await this._put(buffer, st);
        const { data } = await axios.post(
            MODES.anime.creat(src, style).url,
            MODES.anime.creat(src, style).body,
            { headers: hdr(tok) }
        );
        const tid = data?.taskId;
        if (!tid) throw new Error("Failed to create Airbrush task");

        return await this._poll(tok, tid, 'anime');
    }
}

async function airbrushCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        let quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
            message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
            key: {
                remoteJid: chatId,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant
            }
        } : msg;

        const isImage = !!(quoted.message?.imageMessage || (quoted.message?.documentMessage && quoted.message.documentMessage.mimetype?.includes('image')));
        const isViewOnce = !!(quoted.message?.viewOnceMessage?.message?.imageMessage || quoted.message?.viewOnceMessageV2?.message?.imageMessage);

        const style = args[0] || "dreamAnime";

        if (!isImage && !isViewOnce) {
            const helpMsg = userLang === 'ar' || userLang === 'ma'
                ? `❌ المرجو الرد على صورة بالامر *${settings.prefix}airbrush* واختيار الستايل.\n🎨 الستايلات المتاحة: \`${MODES.anime.styles.join(", ")}\``
                : `❌ Please reply to an image with *${settings.prefix}airbrush* and choose a style.\n🎨 Available styles: \`${MODES.anime.styles.join(", ")}\``;
            return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "🎨", key: msg.key } });

        const waitMsg = userLang === 'ar' || userLang === 'ma'
            ? "🔄 جاري تحويل الصورة بالذكاء الاصطناعي (Airbrush)، المرجو الانتظار..."
            : "🔄 Processing image with Airbrush AI, please wait...";
        await sock.sendMessage(chatId, { text: waitMsg }, { quoted: msg });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error("Failed to download image.");

        const ai = new Airbrush();
        const resultUrl = await ai.generate(buffer, style);

        const successMsg = userLang === 'ar' || userLang === 'ma'
            ? "✨ تم معالجة الصورة بنجاح!"
            : "✨ Image processed successfully!";

        await sock.sendMessage(chatId, {
            image: { url: resultUrl },
            caption: `✅ *${successMsg}*\n🎨 Style: ${style}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀᴍᴢᴀ ᴀᴍɪʀɴɪ`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (e) {
        console.error('Airbrush Error:', e);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        const errorMsg = userLang === 'ar' || userLang === 'ma'
            ? `❌ فشلت العملية:\n${e.message}`
            : `❌ Operation failed:\n${e.message}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = airbrushCommand;
