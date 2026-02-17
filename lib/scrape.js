const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

/**
 * Image HD Enhancement (Spyne API)
 * @param {string} url 
 * @param {number} scale 
 */
async function imgHd(url, scale = 2) {
    try {
        const response = await axios(`https://toolsapi.spyne.ai/api/forward`, {
            method: "post",
            data: {
                image_url: url,
                scale: scale,
                save_params: {
                    extension: ".png",
                    quality: 100,
                },
            },
            headers: {
                "content-type": "application/json",
                accept: "*/*",
            },
        });
        return response.data;
    } catch (e) {
        throw new Error('HD Image enhancement failed');
    }
}

/**
 * Screenshot Website
 * @param {string} url 
 * @param {string} device 
 */
async function ssweb(url, device = 'desktop') {
    return new Promise((resolve, reject) => {
        const base = 'https://www.screenshotmachine.com';
        const param = {
            url: url,
            device: device,
            cacheLimit: 0
        };
        axios({
            url: base + '/capture.php',
            method: 'POST',
            data: new URLSearchParams(Object.entries(param)),
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        }).then((data) => {
            const cookies = data.headers['set-cookie'];
            if (data.data.status == 'success') {
                axios.get(base + '/' + data.data.link, {
                    headers: {
                        'cookie': cookies ? cookies.join('') : ''
                    },
                    responseType: 'arraybuffer'
                }).then(({ data }) => {
                    resolve(data);
                }).catch(reject);
            } else {
                reject(new Error(`Screenshot failed: ${data.data.message || 'Unknown error'}`));
            }
        }).catch(reject);
    });
}

/**
 * GitHub User Stalk
 * @param {string} user 
 */
async function githubstalk(user) {
    try {
        const { data } = await axios.get('https://api.github.com/users/' + user);
        return {
            username: data.login,
            nickname: data.name,
            bio: data.bio,
            id: data.id,
            profile_pic: data.avatar_url,
            url: data.html_url,
            type: data.type,
            company: data.company,
            blog: data.blog,
            location: data.location,
            public_repo: data.public_repos,
            followers: data.followers,
            following: data.following,
            created_at: data.created_at,
            updated_at: data.updated_at
        };
    } catch (e) {
        throw new Error('GitHub user not found');
    }
}

/**
 * AI Image Upscale (Remini/HD)
 * Uses high-end neural network APIs for photo restoration.
 * @param {Buffer} buffer 
 */
async function remini(buffer) {
    try {
        const ext = 'jpg';
        const mime = 'image/jpeg';
        const fileName = Math.random().toString(36).slice(2, 8) + '.' + ext;

        const { data: signedData } = await axios.post("https://pxpic.com/getSignedUrl", {
            folder: "uploads",
            fileName
        }, {
            headers: { "Content-Type": "application/json" }
        });

        await axios.put(signedData.presignedUrl, buffer, {
            headers: { "Content-Type": mime }
        });

        const uploadUrl = "https://files.fotoenhancer.com/uploads/" + fileName;

        const { data: aiRes } = await axios.post("https://pxpic.com/callAiFunction", new URLSearchParams({
            imageUrl: uploadUrl,
            targetFormat: 'png',
            needCompress: 'no',
            imageQuality: '100',
            compressLevel: '6',
            fileOriginalExtension: 'png',
            aiFunction: 'upscale',
            upscalingLevel: ''
        }).toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!aiRes.resultImageUrl) throw new Error('AI processing failed');

        const resBuffer = await axios.get(aiRes.resultImageUrl, {
            responseType: 'arraybuffer'
        });

        return resBuffer.data;
    } catch (e) {
        throw new Error('HD Enhancement failed');
    }
}

/**
 * AI Image Background Removal
 * @param {Buffer} buffer 
 */
async function removebg(buffer) {
    try {
        const fileName = Math.random().toString(36).slice(2, 8) + '.png';

        const { data: signedData } = await axios.post("https://pxpic.com/getSignedUrl", {
            folder: "uploads",
            fileName
        }, {
            headers: { "Content-Type": "application/json" }
        });

        await axios.put(signedData.presignedUrl, buffer, {
            headers: { "Content-Type": 'image/png' }
        });

        const uploadUrl = "https://files.fotoenhancer.com/uploads/" + fileName;

        const { data: aiRes } = await axios.post("https://pxpic.com/callAiFunction", new URLSearchParams({
            imageUrl: uploadUrl,
            targetFormat: 'png',
            needCompress: 'no',
            imageQuality: '100',
            compressLevel: '1',
            fileOriginalExtension: 'png',
            aiFunction: 'removeBackground'
        }).toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const resBuffer = await axios.get(aiRes.resultImageUrl, {
            responseType: 'arraybuffer'
        });

        return resBuffer.data;
    } catch (e) {
        throw new Error('Background removal failed');
    }
}

/**
 * AI Image Colorization
 * Uses deep learning to add color to black & white photos.
 * @param {Buffer} buffer 
 */
async function colorize(buffer) {
    const upUrl = "https://photoai.imglarger.com/api/PhoAi/Upload";
    const ckUrl = "https://photoai.imglarger.com/api/PhoAi/CheckStatus";
    const headers = {
        accept: "application/json, text/plain, */*",
        origin: "https://imagecolorizer.com",
        referer: "https://imagecolorizer.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/127 Mobile Safari/537.36"
    };

    try {
        const form = new (require('form-data'))();
        form.append("file", buffer, { filename: "image.jpg", contentType: "image/jpeg" });
        form.append("type", 17);
        form.append("restore_face", "false");
        form.append("upscale", "false");
        form.append("positive_prompts", Buffer.from("masterpiece, high quality, sharp").toString("base64"));
        form.append("negative_prompts", Buffer.from("blur, grain, low quality").toString("base64"));
        form.append("scratches", "false");
        form.append("portrait", "false");
        form.append("color_mode", "2");

        const res = await axios.post(upUrl, form, {
            headers: { ...headers, ...form.getHeaders() }
        });

        const taskCode = res.data?.data?.code;
        if (!taskCode) throw new Error("Failed to start colorization task");

        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const statusRes = await axios.post(ckUrl, { code: taskCode, type: 17 }, {
                headers: { ...headers, "content-type": "application/json" }
            });
            if (statusRes.data?.data?.status === "success") {
                return statusRes.data.data.downloadUrls[0];
            }
        }
        throw new Error("Colorization timeout");
    } catch (e) {
        throw e;
    }
}

/**
 * Generate Fire Logo (FlamingText)
 * @param {string} text 
 */
async function firelogo(text) {
    try {
        const params = {
            _comBuyRedirect: "false",
            script: "fire-logo",
            text,
            symbol_tagname: "popular",
            fontsize: "70",
            fontname: "Cry Uncial",
            fontname_tagname: "cool",
            textBorder: "20",
            growSize: "0",
            antialias: "on",
            hinting: "on",
            justify: "2",
            letterSpacing: "0",
            lineSpacing: "0",
            textSlant: "0",
            textVerticalSlant: "0",
            textAngle: "0",
            textOutline: "false",
            textOutlineSize: "2",
            textColor: "#000000",
            fireSize: "70",
            backgroundResizeToLayers: "on",
            backgroundRadio: "1",
            backgroundColor: "#000000",
            backgroundPattern: "Wood",
            backgroundPattern_tagname: "standard",
            backgroundGradient: "Web20 Blue 3D #10",
            backgroundGradient_tagname: "standard",
            backgroundGradientAngle: "180",
            backgroundGradientCenterX: "50",
            backgroundGradientCenterY: "50",
            backgroundStarburstColorAlt: "#ED2400",
            backgroundStarburstColor1: "#BD2409",
            backgroundStarburstNum: "25",
            backgroundStarburstRayPercentage: "50",
            backgroundStarburstUseColor2: "false",
            backgroundStarburstRayPercentage: "50",
            watermark: "none",
            ext: "png"
        };

        const res = await axios.get('https://www.flamingtext.com/net-fu/image_output.cgi', {
            params,
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
            }
        });

        return res.data?.src || res.data;
    } catch (e) {
        throw new Error('Logo generation failed');
    }
}

module.exports = {
    imgHd,
    ssweb,
    githubstalk,
    remini,
    removebg,
    colorize,
    firelogo
};
