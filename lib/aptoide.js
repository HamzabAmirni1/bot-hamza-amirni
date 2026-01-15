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
        try {
            // Try HTTPS Aptoide API first
            const res = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=${limit}`, { timeout: 10000 });

            let results = [];
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

            // Fallback/Supplement with BK9 API if results are few
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
            // Emergency BK9 try
            try {
                const bkRes = await axios.get(`https://bk9.fun/download/apk?q=${encodeURIComponent(query)}`, { timeout: 8000 });
                if (bkRes.data && bkRes.data.status && bkRes.data.BK9) {
                    const app = bkRes.data.BK9;
                    return [{
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
                    }];
                }
            } catch (e) { }
            return [];
        }
    },

    /**
     * Get direct download info for a package or app name
     * @param {string} id Package name or app name
     */
    downloadInfo: async function (id) {
        try {
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
