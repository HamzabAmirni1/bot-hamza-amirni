const axios = require("axios");
const FormData = require("form-data");

class ImageColorizer {
    constructor() {
        this.cfg = {
            upUrl: "https://photoai.imglarger.com/api/PhoAi/Upload",
            ckUrl: "https://photoai.imglarger.com/api/PhoAi/CheckStatus",
            hdrs: {
                accept: "application/json, text/plain, */*",
                origin: "https://imagecolorizer.com",
                referer: "https://imagecolorizer.com/",
                "user-agent":
                    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/127 Mobile Safari/537.36"
            }
        };
    }

    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    base64(str) {
        return Buffer.from(str || "").toString("base64");
    }

    async upload(buffer, params) {
        const form = new FormData();
        form.append("file", buffer, {
            filename: "image.jpg",
            contentType: "image/jpeg"
        });
        form.append("type", 17);
        form.append("restore_face", "false");
        form.append("upscale", "false");
        form.append("positive_prompts", params.pos);
        form.append("negative_prompts", params.neg);
        form.append("scratches", "false");
        form.append("portrait", "false");
        form.append("color_mode", "2");

        const res = await axios.post(this.cfg.upUrl, form, {
            headers: { ...this.cfg.hdrs, ...form.getHeaders() }
        });

        return res?.data?.data;
    }

    async check(code, type) {
        const res = await axios.post(
            this.cfg.ckUrl,
            { code, type },
            {
                headers: {
                    ...this.cfg.hdrs,
                    "content-type": "application/json"
                }
            }
        );
        return res?.data;
    }

    async generate(imageBuffer, prompt) {
        const posPrompt =
            (prompt || "") +
            ", masterpiece, high quality, sharp, 8k photography";
        const negPrompt =
            "black and white, blur, grain, sepia, low quality";

        const task = await this.upload(imageBuffer, {
            pos: this.base64(posPrompt),
            neg: this.base64(negPrompt)
        });

        if (!task?.code) throw new Error("Failed to get task code");

        for (let i = 0; i < 60; i++) {
            await this.sleep(3000);
            const status = await this.check(task.code, task.type || 17);
            if (status?.data?.status === "success") {
                return status.data.downloadUrls[0];
            }
            if (status?.data?.status === "failed") {
                throw new Error("API reported task failure");
            }
        }

        throw new Error("Processing timeout");
    }
}

module.exports = ImageColorizer;
