const { Jimp } = require('jimp');

/**
 * Apply Blur Effect to Image
 * @param {Buffer} buffer 
 * @param {number} radius 
 */
async function blur(buffer, radius = 5) {
    const image = await Jimp.read(buffer);
    image.blur(radius);
    return await image.getBuffer('image/jpeg');
}

/**
 * Apply Pixelate Effect to Image
 * @param {Buffer} buffer 
 * @param {number} size 
 */
async function pixelate(buffer, size = 10) {
    const image = await Jimp.read(buffer);
    image.pixelate(size);
    return await image.getBuffer('image/jpeg');
}

/**
 * Apply Greyscale Effect to Image
 * @param {Buffer} buffer 
 */
async function greyscale(buffer) {
    const image = await Jimp.read(buffer);
    image.greyscale();
    return await image.getBuffer('image/jpeg');
}

/**
 * Apply Sepia Effect to Image
 * @param {Buffer} buffer 
 */
async function sepia(buffer) {
    const image = await Jimp.read(buffer);
    image.sepia();
    return await image.getBuffer('image/jpeg');
}

/**
 * Rotate Image
 * @param {Buffer} buffer 
 * @param {number} deg 
 */
async function rotate(buffer, deg = 90) {
    const image = await Jimp.read(buffer);
    image.rotate(deg);
    return await image.getBuffer('image/jpeg');
}

/**
 * Flip Image
 * @param {Buffer} buffer 
 * @param {boolean} horizontal 
 * @param {boolean} vertical 
 */
async function flip(buffer, horizontal = true, vertical = false) {
    const image = await Jimp.read(buffer);
    image.flip(horizontal, vertical);
    return await image.getBuffer('image/jpeg');
}

module.exports = {
    blur,
    pixelate,
    greyscale,
    sepia,
    rotate,
    flip
};
