const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

/**
 * Robust Aptoide Downloader Utility
 */
const aptoide = {
    /**
     * Search for apps on Aptoide
     * @param {string} query 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    search: async function (query, limit = 10) {
        let results = [];
        try {
            // 1. Try HTTPS Aptoide API
            const res = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=${limit}`, { timeout: 10000 });

            if (res.data && res.data.datalist && res.data.datalist.list && res.data.datalist.list.length > 0) {
                results = res.data.datalist.list.map((app) => ({
                    name: app.name,
                    package: app.package,
                    size: app.size,
                    sizeMB: (app.size / (1024 * 1024)).toFixed(2),
                    version: app.file?.vername || 'N/A',
                    downloads: app.stats?.downloads || 0,
                    icon: app.icon,
                    downloadUrl: app.file?.path_alt || app.file?.path,
                    updated: app.updated,
                    source: 'Aptoide'
                }));
            }

            // 2. Try Uptodown Scraper if results are few
            if (results.length < 5) {
                try {
                    const { data } = await axios.get(`https://en.uptodown.com/android/search?q=${encodeURIComponent(query)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        timeout: 10000
                    });
                    const cheerio = require('cheerio');
                    const $ = cheerio.load(data);

                    $('.item').each((i, el) => {
                        if (i >= limit) return;
                        const name = $(el).find('.name a').text().trim();
                        const url = $(el).find('.name a').attr('href');
                        const icon = $(el).find('figure img').attr('src');

                        if (name && url) {
                            results.push({
                                name,
                                package: 'Scraped',
                                size: 0,
                                sizeMB: 'N/A',
                                version: 'Latest',
                                downloads: 'N/A',
                                icon,
                                downloadUrl: url, // This is the page URL, downloadInfo handles it
                                updated: 'N/A',
                                source: 'Uptodown'
                            });
                        }
                    });
                } catch (e) {
                    console.log('[Aptoide Utility] Uptodown Search failed:', e.message);
                }
            }

            // 3. Fallback/Supplement with BK9 API
            if (results.length < 3) {
                try {
                    const bkRes = await axios.get(`https://bk9.fun/download/apk?q=${encodeURIComponent(query)}`, { timeout: 8000 });
                    if (bkRes.data && bkRes.data.status && bkRes.data.BK9) {
                        const app = bkRes.data.BK9;
                        if (!results.some(r => r.name.toLowerCase() === app.name.toLowerCase())) {
                            results.push({
                                name: app.name,
                                package: app.id || 'BK9',
                                size: 0,
                                sizeMB: app.size || 'N/A',
                                version: 'N/A',
                                downloads: 'N/A',
                                icon: app.icon,
                                downloadUrl: app.dllink,
                                updated: 'N/A',
                                source: 'BK9'
                            });
                        }
                    }
                } catch (e) {
                    console.log('[Aptoide Utility] BK9 Fallback failed:', e.message);
                }
            }

            return results;
        } catch (error) {
            console.error('[Aptoide Utility] Search failed:', error.message);
            return results;
        }
    },

    /**
     * Get direct download info for a package or app name
     * @param {string} id Package name or app name
     */
    downloadInfo: async function (id) {
        try {
            // If it's an Uptodown URL, try to extract package or name
            if (id.includes('uptodown.com')) {
                const pkg = await this.getPkgFromUptodown(id);
                if (pkg) id = pkg;
                else {
                    // Extract slug as fallback
                    const url = new URL(id);
                    id = url.hostname.split('.')[0];
                    if (id === 'www' || id.length < 3) {
                        id = url.pathname.split('/').filter(p => p && p !== 'android').pop();
                    }
                }
            }

            // Search specifically for the ID/Name
            const apps = await this.search(id, 1);
            if (apps.length > 0) return apps[0];
            return null;
        } catch (error) {
            console.error('[Aptoide Utility] Download Info failed:', error.message);
            return null;
        }
    },

    /**
     * Extract package name from Uptodown URL
     * @param {string} url 
     */
    getPkgFromUptodown: async function (url) {
        try {
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });
            // Look for package name in HTML (common patterns)
            const pkgMatch = res.data.match(/package["']?\s*:\s*["']([^"']+)["']/i) ||
                res.data.match(/data-package=["']([^"']+)["']/i) ||
                res.data.match(/id=([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)/i);

            if (pkgMatch) return pkgMatch[1];

            // Try to find it in technical details section if regex above failed
            const technicalMatch = res.data.match(/<td>Package<\/td>\s*<td>([^<]+)<\/td>/i);
            if (technicalMatch) return technicalMatch[1].trim();

            return null;
        } catch (e) {
            console.log('[Aptoide Utility] Uptodown Pkg Extract failed:', e.message);
            return null;
        }
    },

    /**
     * Stream download to a temp file
     * @param {string} url 
     * @param {number} maxSize Default 300MB
     */
    downloadToFile: async function (url, maxSize = 300 * 1024 * 1024) {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `apk_${Date.now()}.apk`);

        try {
            const head = await axios.head(url, { timeout: 15000 }).catch(() => null);
            const size = head ? parseInt(head.headers['content-length'] || 0) : 0;

            if (size > maxSize) {
                throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(2)}MB`);
            }

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 600000 // 10 mins
            });

            const writer = fs.createWriteStream(filePath);
            await pipeline(response.data, writer);

            return filePath;
        } catch (error) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            throw error;
        }
    }
};

module.exports = aptoide;
