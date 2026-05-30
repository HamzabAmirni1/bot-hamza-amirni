const axios = require('axios');
const { t } = require('../../lib/language');
const { sendWithChannelButton } = require('../../lib/channelButton');
const settings = require('../../settings');

async function githubCommand(sock, chatId, msg, args, commands, userLang) {
    try {
        const input = args.join(' ').trim();

        // ─── No argument → show bot's own repo ───────────────────────
        if (!input) {
            return await showBotRepo(sock, chatId, msg, userLang);
        }

        // ─── Detect if it's a repo (owner/repo) or a user ────────────
        const repoMatch = input.match(/^([a-zA-Z0-9\-\_\.]+)\/([a-zA-Z0-9\-\_\.]+)$/);
        if (repoMatch) {
            return await showRepo(sock, chatId, msg, repoMatch[1], repoMatch[2], userLang);
        }

        // ─── Otherwise treat as username ──────────────────────────────
        const username = input.replace(/^https?:\/\/github\.com\//, '').split('/')[0].trim();
        return await showUser(sock, chatId, msg, username, userLang);

    } catch (error) {
        console.error('[github] Error:', error.message);
        await sendWithChannelButton(sock, chatId,
            `❌ حدث خطأ أثناء جلب البيانات.\n⚠️ ${error.message}`, msg);
    }
}

// ─── Show a GitHub User Profile ──────────────────────────────────────────────
async function showUser(sock, chatId, msg, username, userLang) {
    let userData, reposData;

    try {
        const [userRes, reposRes] = await Promise.all([
            axios.get(`https://api.github.com/users/${username}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            }),
            axios.get(`https://api.github.com/users/${username}/repos?sort=stars&per_page=5`, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            })
        ]);
        userData = userRes.data;
        reposData = reposRes.data;
    } catch (err) {
        if (err.response?.status === 404) {
            return await sendWithChannelButton(sock, chatId,
                `❌ المستخدم *${username}* غير موجود على GitHub!`, msg);
        }
        throw err;
    }

    // ─── Build profile card ───────────────────────────────────────────
    const joined = new Date(userData.created_at).toLocaleDateString('ar-MA', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const updated = new Date(userData.updated_at).toLocaleDateString('ar-MA', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const accountType = userData.type === 'Organization' ? '🏢 منظمة' : '👤 مستخدم';
    const hireable = userData.hireable ? '✅ متاح للعمل' : '❌ غير متاح';

    let caption =
        `🐙 *GitHub Profile — ${userData.login}*\n\n` +
        `${accountType}${userData.name ? ` | *${userData.name}*` : ''}\n` +
        `${userData.bio ? `📝 _${userData.bio}_\n` : ''}` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *Followers:* ${userData.followers.toLocaleString()}   |   *Following:* ${userData.following.toLocaleString()}\n` +
        `📦 *Public Repos:* ${userData.public_repos.toLocaleString()}\n` +
        `📚 *Gists:* ${userData.public_gists.toLocaleString()}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${userData.location ? `📍 *Location:* ${userData.location}\n` : ''}` +
        `${userData.company ? `🏢 *Company:* ${userData.company}\n` : ''}` +
        `${userData.blog ? `🌐 *Website:* ${userData.blog}\n` : ''}` +
        `${userData.twitter_username ? `🐦 *Twitter:* @${userData.twitter_username}\n` : ''}` +
        `${userData.email ? `📧 *Email:* ${userData.email}\n` : ''}` +
        `💼 *للعمل:* ${hireable}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📅 *انضم:* ${joined}\n`;

    // ─── Top repos ────────────────────────────────────────────────────
    if (reposData && reposData.length > 0) {
        caption += `\n🏆 *أبرز المستودعات:*\n`;
        reposData.slice(0, 5).forEach((repo, i) => {
            const lang = repo.language ? ` [${repo.language}]` : '';
            caption += `${i + 1}. *${repo.name}*${lang} — ⭐${repo.stargazers_count} 🍴${repo.forks_count}\n`;
        });
    }

    caption += `\n🔗 ${userData.html_url}\n\n⚔️ *${settings.botName}*`;

    // ─── Send with avatar ─────────────────────────────────────────────
    try {
        await sock.sendMessage(chatId, {
            image: { url: userData.avatar_url },
            caption: caption
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
    }
}

// ─── Show a specific GitHub Repository ───────────────────────────────────────
async function showRepo(sock, chatId, msg, owner, repo, userLang) {
    let repoData, langsData;

    try {
        const [repoRes, langsRes] = await Promise.all([
            axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            }),
            axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            }).catch(() => ({ data: {} }))
        ]);
        repoData = repoRes.data;
        langsData = langsRes.data;
    } catch (err) {
        if (err.response?.status === 404) {
            return await sendWithChannelButton(sock, chatId,
                `❌ المستودع *${owner}/${repo}* غير موجود أو خاص!`, msg);
        }
        throw err;
    }

    const updated = new Date(repoData.updated_at).toLocaleDateString('ar-MA', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const created = new Date(repoData.created_at).toLocaleDateString('ar-MA', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const sizeMB = (repoData.size / 1024).toFixed(2);
    const isPrivate = repoData.private ? '🔒 خاص' : '🌍 عام';
    const license = repoData.license?.spdx_id || '—';
    const topics = repoData.topics?.slice(0, 6).join(', ') || '—';

    // Top languages
    const totalBytes = Object.values(langsData).reduce((a, b) => a + b, 0);
    const langsStr = Object.entries(langsData)
        .slice(0, 4)
        .map(([lang, bytes]) => `${lang} (${((bytes / totalBytes) * 100).toFixed(0)}%)`)
        .join(', ') || repoData.language || '—';

    let caption =
        `📦 *${repoData.full_name}*\n` +
        `${repoData.description ? `📝 _${repoData.description}_\n` : ''}` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⭐ *Stars:* ${repoData.stargazers_count.toLocaleString()}\n` +
        `🍴 *Forks:* ${repoData.forks_count.toLocaleString()}\n` +
        `👁️ *Watchers:* ${repoData.watchers_count.toLocaleString()}\n` +
        `🐛 *Issues:* ${repoData.open_issues_count.toLocaleString()}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌿 *Branch:* \`${repoData.default_branch}\`\n` +
        `🔐 *Visibility:* ${isPrivate}\n` +
        `💾 *Size:* ${sizeMB} MB\n` +
        `🗣️ *Languages:* ${langsStr}\n` +
        `📜 *License:* ${license}\n` +
        `🏷️ *Topics:* ${topics}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📅 *Created:* ${created}\n` +
        `🔄 *Updated:* ${updated}\n` +
        `\n` +
        `🔗 ${repoData.html_url}\n` +
        `📥 *Download:* \`.gitrepo ${repoData.full_name}\`\n` +
        `\n⚔️ *${settings.botName}*`;

    try {
        await sock.sendMessage(chatId, {
            image: { url: repoData.owner.avatar_url },
            caption: caption
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
    }
}

// ─── Show Bot's Own Repo (no args) ───────────────────────────────────────────
async function showBotRepo(sock, chatId, msg, userLang) {
    const helpText =
        `🐙 *GitHub Explorer*\n\n` +
        `📌 *الاستخدام:*\n` +
        `▫️ \`.github <username>\` — بروفايل مستخدم\n` +
        `▫️ \`.github owner/repo\` — معلومات مستودع\n` +
        `▫️ \`.github https://github.com/owner\` — رابط كامل\n\n` +
        `📝 *أمثلة:*\n` +
        `▫️ \`.github HamzabAmirni1\`\n` +
        `▫️ \`.github facebook/react\`\n` +
        `▫️ \`.github torvalds/linux\`\n\n` +
        `💡 لتحميل أي مستودع: \`.gitrepo owner/repo\`\n\n` +
        `⚔️ *${settings.botName}*`;

    await sendWithChannelButton(sock, chatId, helpText, msg);
}

githubCommand.command = ['github', 'git', 'ghub', 'جيتهاب'];
githubCommand.tags = ['tools'];
githubCommand.desc = 'عرض بروفايل GitHub أو معلومات مستودع';

module.exports = githubCommand;
