const axios = require("axios");

class GeminiService {
    constructor(customKey = null) {
        this.config = {
            baseUrl: "https://generativelanguage.googleapis.com/v1beta",
            model: "gemini-2.0-flash-lite",
            endpoint: "/models/{model}:generateContent",
            generation: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
            retry: {
                maxAttempts: 5,
                delayMs: 1000,
            },
        };
        this.keys = [
            "QUl6YVN5Qy04V01Fd0V1NGcxWXB0M3BaaWw5NWswUEJrVUtWcjBz",
            "QUl6YVN5RGdDMVpwQnY3eXhMT3dLejBXYUhJM2NTaTlsUUJ2QXNZ",
            "QUl6YVN5RFJud01ZMU5GalZJSFhJU05sZnFBU040THIyckozVE9v",
            "QUl6YVN5REw5YTRDSm9icEQ4a0ttM1d3LXlBV0lvajZhbWgzMzA0",
            "QUl6YVN5Q29aZGRwSXk5TFU1Vm9uTUc1djYwRl8zaE5KeUpja3JR",
        ];
        this.idx = 0;
        this.custKey = customKey;
    }

    getActiveKey() {
        const keyIndex = this.custKey ? null : this.idx % this.keys.length;
        const encodedKey = this.custKey || this.keys[keyIndex];
        const decodedKey = Buffer.from(encodedKey, "base64").toString("utf-8");
        if (!this.custKey && keyIndex !== null) {
            this.idx = (this.idx + 1) % this.keys.length;
        }
        return decodedKey;
    }

    buildUrl() {
        return `${this.config.baseUrl}${this.config.endpoint.replace("{model}", this.config.model)}`;
    }

    async generate(params = {}) {
        let lastError = null;
        const maxAttempts = Math.min(this.config.retry.maxAttempts, this.keys.length);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const key = this.getActiveKey();
                const url = `${this.buildUrl()}?key=${key}`;

                const response = await axios.post(url, {
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: params.prompt || "Generate a creative video idea." }],
                        },
                    ],
                    generationConfig: this.config.generation,
                });

                const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No result generated.";
                return { result };
            } catch (e) {
                lastError = e;
                const status = e.response?.status;
                console.error(`[GeminiService] Attempt ${attempt + 1} failed: ${e.message} (Status: ${status})`);

                // If it's a 429 (Rate Limit) or 401/403 (Invalid/Expired Key), try next key immediately
                if (status === 429 || status === 401 || status === 403) {
                    continue;
                }

                // For other errors, just stop or retry if configured
                if (attempt < maxAttempts - 1) {
                    await new Promise(r => setTimeout(r, this.config.retry.delayMs));
                }
            }
        }
        return { error: lastError?.message || "All attempts failed." };
    }
}

module.exports = GeminiService;
