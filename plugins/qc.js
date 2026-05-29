const WSF = require('wa-sticker-formatter');
const axios = require('axios');

let handler = async (m, { conn, args }) => {
    let text;
    if (args.length >= 1) {
        text = args.join(" ");
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text;
    } else {
        return m.reply("Please enter or reply to a text to generate a quote!");
    }

    let who = m.quoted ? m.quoted.sender : m.sender;
    let name = m.quoted ? m.quoted.name : m.name;

    if (text.length > 100) {
        return m.reply("Maximum text length is 100 characters!");
    }

    let pp = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://telegra.ph/file/320b066dc81928b782c7b.png');

    // Function to create and return the image buffer
    const createImageBuffer = async (backgroundColor) => {
        const obj = {
            "type": "quote",
            "format": "png",
            "backgroundColor": backgroundColor,
            "width": 512,
            "height": 768,
            "scale": 2,
            "messages": [{
                "entities": [],
                "avatar": true,
                "from": {
                    "id": 1,
                    "name": name,
                    "photo": {
                        "url": pp
                    }
                },
                "text": text,
                "replyMessage": {}
            }]
        };

        const response = await axios.post('https://qc.botcahx.eu.org/generate', obj, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return Buffer.from(response.data.result.image, 'base64');
    };

    try {
        const whiteBuffer = await createImageBuffer("#ffffff");
        const blackBuffer = await createImageBuffer("#000000");

        // Create stickers
        let whiteSticker = await createSticker(whiteBuffer, global.packname, global.author);
        let blackSticker = await createSticker(blackBuffer, global.packname, global.author);

        if (whiteSticker) await conn.sendFile(m.chat, whiteSticker, 'QuoteWhite.webp', '', m);
        if (blackSticker) await conn.sendFile(m.chat, blackSticker, 'QuoteBlack.webp', '', m);
    } catch (error) {
        console.error(error);
        m.reply('An error occurred while processing your request.');
    }
};

handler.help = ['qc'];
handler.tags = ['sticker'];
handler.command = /^(qc|quotely)$/i;
module.exports = handler;

async function createSticker(img, packname, author, categories = ['']) {
    const stickerMetadata = {
        type: 'full',
        pack: packname,
        author,
        categories,
    };
    return await new WSF.Sticker(img, stickerMetadata).build();
}
