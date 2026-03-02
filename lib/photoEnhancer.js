const axios = require("axios");

class PhotoEnhancer {
    constructor() {
        this.cfg = {
            base: "https://photoenhancer.pro",
            end: {
                enhance: "/api/enhance",
                status: "/api/status",
                removeBg: "/api/remove-background",
                upscale: "/api/upscale"
            },
            headers: {
                accept: "*/*",
                "content-type": "application/json",
                origin: "https://photoenhancer.pro",
                referer: "https://photoenhancer.pro/",
                "user-agent":
                    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/127 Mobile"
            }
        };
    }

    wait(ms) {
        return new Promise(r => setTimeout(r, ms || 3000));
    }

    async img(input) {
        if (!input) return null;
        if (Buffer.isBuffer(input)) {
            return `data:image/jpeg;base64,${input.toString("base64")}`;
        }
        return input;
    }

    async poll(id) {
        for (let i = 0; i < 60; i++) {
            await this.wait();
            try {
                const { data } = await axios.get(
                    `${this.cfg.base}${this.cfg.end.status}`,
                    {
                        params: { id },
                        headers: this.cfg.headers
                    }
                );
                if (data?.status === "succeeded") return data;
                if (data?.status === "failed") throw new Error("Processing failed");
            } catch (e) {
                console.error("Polling error:", e.message);
            }
        }
        throw new Error("Processing timeout");
    }

    async generate({ imageUrl, type }) {
        const imageData = await this.img(imageUrl);
        let endpoint = this.cfg.end.enhance;
        let body = { imageData, mode: "ultra", fileName: "image.png" };

        if (type === "remove-bg") {
            endpoint = this.cfg.end.removeBg;
            body = { imageData };
        }

        if (type === "upscale") {
            endpoint = this.cfg.end.upscale;
            body = { imageData, targetResolution: "4K" };
        }

        const init = await axios.post(
            `${this.cfg.base}${endpoint}`,
            body,
            { headers: this.cfg.headers }
        );

        if (init.data?.predictionId) {
            const final = await this.poll(init.data.predictionId);
            return final.resultUrl;
        }

        return init.data?.resultUrl;
    }
}

module.exports = PhotoEnhancer;
