const { spawn } = require('child_process');
const { join } = require('path');

const __dirname = path.resolve(); // Simple fallback for __dirname in CommonJS files if needed, but we'll use join properly.

/**
 * Levelup image generation
 * Requires GraphicsMagick (gm) or ImageMagick (magick) installed on the system.
 * @param {string} teks 
 * @param {number} level 
 * @returns {Promise<Buffer>}
 */
function levelup(teks, level) {
    return new Promise(async (resolve, reject) => {
        // Placeholder check for support - in a real environment, you'd check if gm/magick is in PATH
        const support = { gm: true, magick: true, convert: true };
        if (!support.gm && !support.magick) return reject('No GraphicsMagick or ImageMagick found on system!');

        const font = join(process.cwd(), './src/font');
        let fontLevel = join(font, './level_c.otf');
        let fontTexts = join(font, './texts.otf');
        let xtsx = join(process.cwd(), './src/lvlup_template.png');

        let annotations = '+1385+260';
        if (level > 2) annotations = '+1370+260';
        if (level > 10) annotations = '+1330+260';
        if (level > 50) annotations = '+1310+260';
        if (level > 100) annotations = '+1260+260';

        const [_spawnprocess, ..._spawnargs] = [
            'magick', // Prioritize magick
            'convert',
            xtsx,
            '-font', fontTexts,
            '-fill', '#0F3E6A',
            '-size', '1024x784',
            '-pointsize', '68',
            '-interline-spacing', '-7.5',
            '-annotate', '+153+200', teks,
            '-font', fontLevel,
            '-fill', '#0A2A48',
            '-size', '1024x784',
            '-pointsize', '140',
            '-interline-spacing', '-1.2',
            '-annotate', annotations, level,
            '-append',
            'jpg:-'
        ];

        let bufs = [];
        spawn(_spawnprocess, _spawnargs)
            .on('error', (err) => {
                console.error('Canvas Error:', err.message);
                reject('Error generating levelup image. Ensure ImageMagick is installed.');
            })
            .on('close', () => {
                if (bufs.length === 0) return reject('Empty buffer from ImageMagick');
                return resolve(Buffer.concat(bufs));
            })
            .stdout.on('data', chunk => bufs.push(chunk));
    });
}

module.exports = { levelup };
