const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const axios = require('axios');
const speed = require('performance-now');

let handler = (m) => m;
handler.all = async function (m) {
  let name = await conn.getName(m.sender);
  let pp =
    "https://i0.wp.com/www.gambarunik.id/wp-content/uploads/2019/06/Top-Gambar-Foto-Profil-Kosong-Lucu-Tergokil-.jpg";
  let fotonyu = "https://files.catbox.moe/hnbuh3.jpg";
  let logo = "https://files.catbox.moe/hnbuh3.jpg"; // define logo aquí
  let namebot = "SILANA LITE AI";
  let sig = "https://instagram.com/noureddine_ouafy";

  try {
    // pp = await this.profilePictureUrl(m.sender, "image");
  } catch (e) {
    console.error(e);
  } finally {
    global.emror = "https://files.catbox.moe/hnbuh3.jpg";

    global.doc = pickRandom([
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/pdf",
    ]);
    global.fsizedoc = pickRandom([2000, 3000, 2023000, 2024000]);

    // módulos globales
    global.axios = require("axios");
    global.fetch = require("node-fetch");
    global.cheerio = require("cheerio");
    global.fs = require("fs");

    let timestamp = speed();
    let latensi = speed() - timestamp;
    let ms = await latensi.toFixed(4);
    const _uptime = process.uptime() * 1000;

    // contacto del owner
    global.kontak2 = [
      [
        owner[0],
        await conn.getName(owner[0] + "212717457920@s.whatsapp.net"),
        "SILANA AI",
        "https://whatsapp.com",
        true,
      ],
    ];

    global.fkon = {
      key: {
        fromMe: false,
        participant: m.sender,
        ...(m.chat
          ? {
              remoteJid: "BROADCAST GROUP",
            }
          : {}),
      },
      message: {
        contactMessage: {
          displayName: `${name}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split("@")[0]}:${m.sender.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        },
      },
    };

    global.fVerif = {
      key: {
        participant: "0@s.whatsapp.net",
        remoteJid: "0@s.whatsapp.net",
      },
      message: {
        conversation: `_${namebot} تم التحقق عن طريق الواتساب_`,
      },
    };

    global.ephemeral = "86400";

    global.ucapan = ucapan();
    global.botdate = date();

    global.adReply = {
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363285847738492@newsletter",
          serverMessageId: 103,
          newsletterName: `SILANA LITE AI    |   هيا نحو النجاح 🧑‍🏫`,
        },
        externalAdReply: {
          title: namebot,
          body: global.ucapan,
          thumbnailUrl: logo,
          sourceUrl: sig,
          mediaType: 1,
          renderLargerThumbnail: false,
        },
      },
    };

    global.fakeig = {
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: namebot,
          body: ucapan(),
          thumbnailUrl: pp,
          sourceUrl: sig,
        },
      },
    };
  }
};
module.exports = handler;

function date() {
  let d = new Date(new Date() + 3600000);
  let locale = "id";
  let week = d.toLocaleDateString(locale, {
    weekday: "long",
  });
  let date = d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let tgl = `${week}, ${date}`;
  return tgl;
}

function ucapan() {
  const time = moment.tz("Africa/Casablanca").format("HH");
  let res = "اضغط هنا لمتابعة صاحب البوت  ";
  if (time >= 4) {
    res = "اضغط هنا لمتابعة صاحب البوت  ";
  }
  if (time > 10) {
    res = "اضغط هنا لمتابعة صاحب البوت  ";
  }
  if (time >= 15) {
    res = "اضغط هنا لمتابعة صاحب البوت  ";
  }
  if (time >= 18) {
    res = "اضغط هنا لمتابعة صاحب البوت  ";
  }
  return res;
}

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())];
          }
