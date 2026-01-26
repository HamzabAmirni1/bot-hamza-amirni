const { uploadImage } = require('./lib/uploadImage');
const fs = require('fs');
const path = require('path');

async function uploadGeneratedImages() {
    const images = [
        'C:/Users/hp/.gemini/antigravity/brain/b1da03b9-bb22-4994-b568-14d8e7de2ec4/premium_bot_ai_1_1769429786754.png',
        'C:/Users/hp/.gemini/antigravity/brain/b1da03b9-bb22-4994-b568-14d8e7de2ec4/premium_bot_ai_2_1769429802813.png',
        'C:/Users/hp/.gemini/antigravity/brain/b1da03b9-bb22-4994-b568-14d8e7de2ec4/premium_bot_ai_3_1769429817801.png',
        'C:/Users/hp/.gemini/antigravity/brain/b1da03b9-bb22-4994-b568-14d8e7de2ec4/premium_bot_ai_4_1769429833638.png'
    ];

    for (const imgPath of images) {
        if (fs.existsSync(imgPath)) {
            const buffer = fs.readFileSync(imgPath);
            try {
                const url = await uploadImage(buffer);
                console.log(`UPLOAD_RESULT: ${path.basename(imgPath)} -> ${url}`);
            } catch (e) {
                console.error(`UPLOAD_FAILED: ${path.basename(imgPath)}`);
            }
        }
    }
}

uploadGeneratedImages();
