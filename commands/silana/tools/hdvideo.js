// plugin by noureddine ouafy
// scrape by https://share.petrolabs.me/tools/videoenhance
const { createRequire } = require('module');
const _require = createRequire(__filename);
const fsSync = _require('fs');
const fs = _require('fs/promises');
const { resolve, dirname, join } = _require('path');
const crypto = _require('crypto');
const axios = _require('axios');

// Get the current directory to store temporary files
const __bdir = dirname(__filename);
const tempDir = join(__bdir, 'temp');

// Ensure the temp directory exists lazily (no top-level await)
function ensureTempDir() {
    if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true });
    }
}

async function jsonFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        return { __httpError: true, status: res.status, raw: text };
    }
    if (!res.ok) {
        return { __httpError: true, status: res.status, raw: json };
    }
    return json;
}

const baseApi = "https://api.unblurimage.ai";

/**
 * @param {import('@whiskeysockets/baileys').WAMessage} m 
 * @param {object} param1 
 * @param {import('@whiskeysockets/baileys').WASocket} param1.conn
 */
let handler = async (m, { conn }) => {
    ensureTempDir();
    const productSerial = crypto.randomUUID().replace(/-/g, "");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let tempFilePath = null;

    try {
        // --- 1. Get Video from Message ---
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || '';
        if (!/video/.test(mime)) {
            return m.reply("Please send or reply to a video with this command.");
        }

        let media = await q.download?.();
        if (!media) {
            return m.reply("Failed to download video.");
        }

        tempFilePath = join(tempDir, `input-video-${m.sender}-${Date.now()}.mp4`);
        await fs.writeFile(tempFilePath, media);
        const absPath = resolve(tempFilePath);

        await m.reply("✅ Video received. Starting the upscale process...");

        // --- 2. Video Upload (Step 1: Request Upload URL) ---
        const uploadForm = new FormData();
        uploadForm.set("video_file_name", `cli-${Date.now()}.mp4`);

        const uploadResp = await jsonFetch(
            `${baseApi}/api/upscaler/v1/ai-video-enhancer/upload-video`,
            { method: "POST", body: uploadForm }
        );

        if (uploadResp.__httpError || uploadResp.code !== 100000) {
            return m.reply(`❌ Failed to request upload URL. Code: ${uploadResp.code || uploadResp.status}`);
        }

        const { url: uploadUrl, object_name } = uploadResp.result || {};
        if (!uploadUrl || !object_name) {
            return m.reply("❌ Failed to get upload URL or object name.");
        }

        // --- 3. Video Upload (Step 2: PUT File to URL) ---
        const fileBuffer = await fs.readFile(absPath);

        const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "content-type": "video/mp4" },
            body: fileBuffer,
        });

        if (!putRes.ok) {
            return m.reply(`❌ Failed to upload file. Status: ${putRes.status}`);
        }

        await m.reply("⬆️ Video successfully uploaded. Starting conversion job...");

        // --- 4. Create Enhancer Job ---
        const cdnUrl = `https://cdn.unblurimage.ai/${object_name}`;
        const jobForm = new FormData();
        jobForm.set("original_video_file", cdnUrl);
        jobForm.set("resolution", "2k");
        jobForm.set("is_preview", "false");

        const createJobResp = await jsonFetch(
            `${baseApi}/api/upscaler/v2/ai-video-enhancer/create-job`,
            {
                method: "POST",
                body: jobForm,
                headers: {
                    "product-serial": productSerial,
                    authorization: "",
                },
            }
        );

        if (createJobResp.__httpError || createJobResp.code !== 100000) {
            return m.reply(`❌ Failed to create job. Code: ${createJobResp.code || createJobResp.status}`);
        }

        const { job_id } = createJobResp.result || {};
        if (!job_id) {
            return m.reply("❌ Job ID not found.");
        }

        await m.reply(`⏳ Job ID: ${job_id} created. Waiting for results... (Max 5 minutes)`);

        // --- 5. Poll Job Status ---
        const maxTotalWaitMs = 5 * 60 * 1000;
        const startTime = Date.now();
        let attempt = 0;
        let result;

        while (true) {
            attempt++;
            const jobResp = await jsonFetch(
                `${baseApi}/api/upscaler/v2/ai-video-enhancer/get-job/${job_id}`,
                {
                    method: "GET",
                    headers: {
                        "product-serial": productSerial,
                        authorization: "",
                    },
                }
            );

            if (!jobResp.__httpError && jobResp.code === 100000) {
                result = jobResp.result || {};
                if (result.output_url) break;
            } else if (!jobResp.__httpError && jobResp.code !== 300010) {
                return m.reply(`❌ Job failed or unknown status. Code: ${jobResp.code}`);
            }

            const elapsed = Date.now() - startTime;
            if (elapsed > maxTotalWaitMs) {
                return m.reply(`⏰ Timeout reached after ${Math.round(elapsed / 1000)} seconds.`);
            }

            await sleep(attempt === 1 ? 30 * 1000 : 10 * 1000);
        }

        // --- 6. Send Result ---
        const { output_url } = result;
        if (output_url) {
            await m.reply("✅ Job finished. Sending the upscaled video...");
            const { data } = await axios.get(output_url, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                video: Buffer.from(data),
                caption: `🌟 **Video Upscale Successful!**\n\nResolution: 2K\nURL: ${output_url}`,
                fileName: `upscaled-${job_id}.mp4`
            }, { quoted: m });
        } else {
            m.reply("❌ Job finished, but the output URL was not found.");
        }

    } catch (err) {
        console.error("Error running hdvideo handler:", err);
        m.reply(`❌ A runtime error occurred: ${err.message}`);
    } finally {
        // --- 7. Cleanup ---
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (e) {
                console.error(`Failed to delete temp file:`, e);
            }
        }
    }
};

handler.help = ['hdvideo'];
handler.command = ['hdvideo'];
handler.tags = ['tools'];
handler.limit = true;
module.exports = handler;
