const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { t } = require('../../lib/language');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

/**
 * Parse GitHub repo URL or shorthand (owner/repo)
 * Supports:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch
 *   - owner/repo
 *   - owner/repo@branch
 */
function parseGitHubInput(input) {
    // Full URL
    const urlMatch = input.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)(?:\/tree\/([^\/\s#?]+))?/i);
    if (urlMatch) {
        return {
            owner: urlMatch[1],
            repo: urlMatch[2].replace(/\.git$/, ''),
            branch: urlMatch[3] || null
        };
    }

    // shorthand: owner/repo@branch or owner/repo
    const shortMatch = input.match(/^([a-zA-Z0-9\-\_\.]+)\/([a-zA-Z0-9\-\_\.]+)(?:@([a-zA-Z0-9\-\_\.\/]+))?$/);
    if (shortMatch) {
        return {
            owner: shortMatch[1],
            repo: shortMatch[2].replace(/\.git$/, ''),
            branch: shortMatch[3] || null
        };
    }

    return null;
}

async function gitrepoCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        const input = args.join(' ').trim();

        // ─── No input → show help ───────────────────────────────────
        if (!input) {
            const helpText =
                `📦 *${t('gitrepo.title', {}, userLang)}*\n\n` +
                `📌 *${t('gitrepo.usage_label', {}, userLang)}:*\n` +
                `▫️ \`${settings.prefix}gitrepo owner/repo\`\n` +
                `▫️ \`${settings.prefix}gitrepo owner/repo@branch\`\n` +
                `▫️ \`${settings.prefix}gitrepo https://github.com/owner/repo\`\n\n` +
                `📝 *${t('gitrepo.example_label', {}, userLang)}:*\n` +
                `▫️ \`${settings.prefix}gitrepo HamzabAmirni1/bot-hamza-amirni\`\n` +
                `▫️ \`${settings.prefix}gitrepo facebook/react@main\`\n\n` +
                `⚔️ *${settings.botName}*`;
            return await sendWithChannelButton(sock, chatId, helpText, msg);
        }

        // ─── Parse input ────────────────────────────────────────────
        const parsed = parseGitHubInput(input);
        if (!parsed) {
            return await sendWithChannelButton(sock, chatId, t('gitrepo.invalid', {}, userLang), msg);
        }

        const { owner, repo, branch: inputBranch } = parsed;

        // ─── Loading message ─────────────────────────────────────────
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: msg.key }
        });
        await sock.sendMessage(chatId, {
            text: t('gitrepo.loading', { repo: `${owner}/${repo}` }, userLang)
        }, { quoted: msg });

        // ─── Fetch repo metadata ─────────────────────────────────────
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        let repoData;
        try {
            const { data } = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 15000
            });
            repoData = data;
        } catch (err) {
            if (err.response?.status === 404) {
                return await sendWithChannelButton(sock, chatId, t('gitrepo.not_found', { repo: `${owner}/${repo}` }, userLang), msg);
            }
            throw err;
        }

        const branch = inputBranch || repoData.default_branch;
        const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;

        // ─── Size check ──────────────────────────────────────────────
        const sizeKB = repoData.size; // KB
        const sizeMB = (sizeKB / 1024).toFixed(2);
        const MAX_MB = 300;

        if (sizeKB > MAX_MB * 1024) {
            return await sendWithChannelButton(sock, chatId,
                t('gitrepo.too_large', { size: sizeMB, max: MAX_MB }, userLang),
                msg
            );
        }

        // ─── Build info caption ──────────────────────────────────────
        const license = repoData.license?.spdx_id || '—';
        const topics = repoData.topics?.length > 0 ? repoData.topics.slice(0, 5).join(', ') : '—';
        const updatedAt = new Date(repoData.updated_at).toLocaleDateString('ar-MA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const isPrivate = repoData.private ? '🔒 خاص' : '🌍 عام';

        const caption =
            `📦 *${repoData.full_name}*\n\n` +
            `📝 *${t('gitrepo.desc', {}, userLang)}:* ${repoData.description || '—'}\n` +
            `🌿 *${t('gitrepo.branch', {}, userLang)}:* \`${branch}\`\n` +
            `🔐 *${t('gitrepo.visibility', {}, userLang)}:* ${isPrivate}\n\n` +
            `⭐ *${t('gitrepo.stars', {}, userLang)}:* ${repoData.stargazers_count.toLocaleString()}\n` +
            `🍴 *${t('gitrepo.forks', {}, userLang)}:* ${repoData.forks_count.toLocaleString()}\n` +
            `👁️ *${t('gitrepo.watchers', {}, userLang)}:* ${repoData.watchers_count.toLocaleString()}\n` +
            `🐛 *${t('gitrepo.issues', {}, userLang)}:* ${repoData.open_issues_count.toLocaleString()}\n\n` +
            `💾 *${t('gitrepo.size', {}, userLang)}:* ${sizeMB} MB\n` +
            `🗣️ *${t('gitrepo.lang', {}, userLang)}:* ${repoData.language || '—'}\n` +
            `📜 *${t('gitrepo.license', {}, userLang)}:* ${license}\n` +
            `🏷️ *${t('gitrepo.topics', {}, userLang)}:* ${topics}\n` +
            `📅 *${t('gitrepo.updated', {}, userLang)}:* ${updatedAt}\n\n` +
            `🔗 ${repoData.html_url}\n\n` +
            `⚔️ *${settings.botName}*`;

        // ─── Follow redirect to get real download URL ────────────────
        let finalUrl = downloadUrl;
        try {
            const headRes = await axios.head(downloadUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Mozilla/5.0'
                },
                maxRedirects: 5,
                timeout: 20000
            });
            if (headRes.request?.res?.responseUrl) {
                finalUrl = headRes.request.res.responseUrl;
            } else if (headRes.config?.url) {
                finalUrl = headRes.config.url;
            }
        } catch (e) {
            // Use original URL
        }

        // ─── Send as document ────────────────────────────────────────
        const fileName = `${repo}-${branch}.zip`;

        await sock.sendMessage(chatId, {
            react: { text: '📦', key: msg.key }
        });

        try {
            await sock.sendMessage(chatId, {
                document: { url: finalUrl },
                fileName: fileName,
                mimetype: 'application/zip',
                caption: caption
            }, { quoted: msg });

            await sock.sendMessage(chatId, {
                react: { text: '✅', key: msg.key }
            });

        } catch (sendErr) {
            console.error('[gitrepo] Direct URL failed, downloading buffer...', sendErr.message);

            // Fallback: Download buffer locally
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            const tmpFile = path.join(tmpDir, `gitrepo_${Date.now()}.zip`);

            try {
                const response = await axios({
                    url: downloadUrl,
                    method: 'GET',
                    responseType: 'stream',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    maxRedirects: 10,
                    timeout: 120000
                });

                const writer = fs.createWriteStream(tmpFile);
                response.data.pipe(writer);
                await new Promise((res, rej) => {
                    writer.on('finish', res);
                    writer.on('error', rej);
                });

                const fileBuffer = fs.readFileSync(tmpFile);

                await sock.sendMessage(chatId, {
                    document: fileBuffer,
                    fileName: fileName,
                    mimetype: 'application/zip',
                    caption: caption
                }, { quoted: msg });

                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: msg.key }
                });

            } finally {
                try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) { }
            }
        }

    } catch (error) {
        console.error('[gitrepo] Error:', error.message);
        await sendWithChannelButton(sock, chatId, t('gitrepo.error', { error: error.message }, userLang), msg);
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: msg.key }
        });
    }
}

gitrepoCommand.command = ['gitrepo', 'dlrepo', 'repodown', 'gitdl', 'clonerepo'];
gitrepoCommand.tags = ['downloader'];
gitrepoCommand.desc = 'تحميل أي مستودع من GitHub كملف ZIP';

module.exports = gitrepoCommand;
