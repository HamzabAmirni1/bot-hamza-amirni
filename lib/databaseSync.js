const fs = require('fs');
const path = require('path');
const https = require('https');
const settings = require('../settings');

const supabaseUrl = settings.supabaseUrl;
const supabaseKey = settings.supabaseKey;

let isSyncEnabled = true;

// Helper to make https requests to Supabase PostgREST REST API
function makeRequest(method, pathUrl, postData = null) {
    return new Promise((resolve, reject) => {
        if (!supabaseUrl || !supabaseKey) {
            return reject(new Error('Supabase configuration missing'));
        }
        
        const url = new URL(supabaseUrl);
        const options = {
            hostname: url.hostname,
            path: pathUrl,
            method: method,
            headers: {
                'apikey': supabaseKey,
                'Authorization': 'Bearer ' + supabaseKey
            }
        };

        if (postData) {
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(postData);
            options.headers['Prefer'] = 'resolution=merge-duplicates';
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body ? JSON.parse(body) : null);
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

const DATA_DIR = path.join(__dirname, '../data');
const trackedFiles = ['users.json', 'banned.json', 'subscribed_users.json', 'pending_users.json'];

// Map file name to its Supabase key
function getDbKey(filename) {
    return 'file_' + filename.replace(/\./g, '_');
}

// Download a file from Supabase and save it locally
async function downloadFile(filename) {
    const key = getDbKey(filename);
    const localPath = path.join(DATA_DIR, filename);
    
    try {
        console.log(`[DBSync] Downloading ${filename} from Supabase...`);
        const result = await makeRequest('GET', `/rest/v1/whatsapp_auth?phone_number=eq.${key}`);
        if (result && result.length > 0 && result[0].session_data) {
            // Temporarily disable sync to prevent upload trigger
            isSyncEnabled = false;
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs.writeFileSync(localPath, JSON.stringify(result[0].session_data, null, 2), 'utf8');
            console.log(`[DBSync] Successfully restored ${filename} from database`);
            isSyncEnabled = true;
            return true;
        } else {
            console.log(`[DBSync] No remote data found for ${filename}, keeping local or empty`);
            return false;
        }
    } catch (e) {
        console.error(`[DBSync] Error downloading ${filename}:`, e.message);
        isSyncEnabled = true;
        return false;
    }
}

// Upload local file content to Supabase
async function uploadFile(filename) {
    if (!isSyncEnabled) return;
    const key = getDbKey(filename);
    const localPath = path.join(DATA_DIR, filename);
    
    try {
        if (!fs.existsSync(localPath)) return;
        const fileContent = fs.readFileSync(localPath, 'utf8');
        let parsedData;
        try {
            parsedData = JSON.parse(fileContent);
        } catch (e) {
            console.error(`[DBSync] Invalid JSON in ${filename}, skipping upload`);
            return;
        }
        
        console.log(`[DBSync] Uploading ${filename} to Supabase...`);
        const payload = JSON.stringify({
            phone_number: key,
            session_data: parsedData,
            updated_at: new Date().toISOString()
        });
        
        await makeRequest('POST', '/rest/v1/whatsapp_auth', payload);
        console.log(`[DBSync] Successfully uploaded ${filename} to database`);
    } catch (e) {
        console.error(`[DBSync] Error uploading ${filename}:`, e.message);
    }
}

// Debounce timer map to avoid multiple rapid uploads
const debounceTimers = new Map();

function triggerUpload(filename) {
    if (debounceTimers.has(filename)) {
        clearTimeout(debounceTimers.get(filename));
    }
    const timer = setTimeout(() => {
        debounceTimers.delete(filename);
        uploadFile(filename);
    }, 2000); // Debounce for 2 seconds
    debounceTimers.set(filename, timer);
}

// Start watching local data folder for changes
function startWatcher() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    console.log(`[DBSync] Starting watcher for ${DATA_DIR}...`);
    
    // Watch directory for changes
    fs.watch(DATA_DIR, (eventType, filename) => {
        if (filename && trackedFiles.includes(filename)) {
            triggerUpload(filename);
        }
    });
}

// Initialize database sync (download remote files, then start watcher)
async function initSync() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('[DBSync] Supabase not configured. Persistence sync disabled.');
        return;
    }
    
    console.log('[DBSync] Initializing database sync...');
    
    // Restore each tracked file
    for (const file of trackedFiles) {
        await downloadFile(file);
    }
    
    // Start watching for changes
    startWatcher();
}

module.exports = {
    initSync,
    downloadFile,
    uploadFile
};
