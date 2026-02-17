const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const webp = require('node-webpmux');
const settings = require('../settings');

async function emojimixCommand(sock, chatId, msg) {
    try {
        const text = msg.message?.conversation?.trim() ||
            msg.message?.extendedTextMessage?.text?.trim() || '';

        const args = text.split(' ').slice(1);

        if (!args[0]) {
            return await sock.sendMessage(chatId, { text: '🎴 مثال: .emojimix 😎+🥰' }, { quoted: msg });
        }

        if (!args[0].includes('+')) {
            return await sock.sendMessage(chatId, {
                text: '✳️ دير علامة *+* بين الإيموجي\n\n📌 مثال: \n*.emojimix* 😎+🥰'
            }, { quoted: msg });
        }

        let [emoji1, emoji2] = args[0].split('+').map(e => e.trim());

        // Use Google's Emoji Kitchen API (via Tenor or direct endpoint)
        const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ هاد الجوج إيموجي ما يقدروش يتخلطو! جرب وحدين خرين.'
            }, { quoted: msg });
        }

        const imageUrl = data.results[0].url;

        // Create temp directory if it doesn't exist
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Generate random filenames
        const tempInput = path.join(tmpDir, `temp_mix_${Date.now()}.png`);
        const tempOutput = path.join(tmpDir, `sticker_mix_${Date.now()}.webp`);

        // Download image
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        fs.writeFileSync(tempInput, buffer);

        // Convert to WebP using ffmpeg
        const ffmpegCommand = `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;

        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error) => {
                if (error) {
                    console.error('FFmpeg error:', error);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Check if output file exists
        if (!fs.existsSync(tempOutput)) {
            throw new Error('Failed to create sticker file');
        }

        // Add metadata
        const stickerBuffer = fs.readFileSync(tempOutput);
        const img = new webp.Image();
        await img.load(stickerBuffer);

        const json = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': settings.packname || 'Hamza Amirni',
            'sticker-pack-publisher': settings.author || 'Hamza Amirni',
            'emojis': ['❤️', '😂']
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);
        img.exif = exif;

        const finalBuffer = await img.save(null);

        await sock.sendMessage(chatId, {
            sticker: finalBuffer
        }, { quoted: msg });

        // Cleanup
        try {
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);
        } catch (err) {
            console.error('Error cleaning up temp files:', err);
        }

    } catch (error) {
        console.error('Error in emojimix command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ فشل دمج الإيموجي! حاول مرة أخرى.'
        }, { quoted: msg });
    }
}

module.exports = emojimixCommand;
