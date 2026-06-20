const settings = require('./settings');
global.settings = settings;
const Baileys = require('@whiskeysockets/baileys');
let makeInMemoryStoreFunc = Baileys.makeInMemoryStore || (Baileys.default && Baileys.default.makeInMemoryStore);

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    delay,
    Browsers
} = Baileys;

// --- GLOBAL CRASH PROTECTION ---
const IGNORED_ERRORS = [
    'Timed Out',
    'timed out',
    'Connection Closed',
    'connection closed',
    'uploadPreKeysToServerIfRequired',
    'getAvailablePreKeysOnServer',
    'waitForMessage',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    'read ECONNRESET',
    'write ECONNRESET',
    'Could not decode',
    'Conflict',
    'conflict'
];

process.on('unhandledRejection', (reason, promise) => {
    const msg = reason?.message || reason?.toString() || '';
    const stack = reason?.data?.stack || reason?.stack || '';
    const isIgnored = IGNORED_ERRORS.some(e =>
        msg.includes(e) || stack.includes(e)
    );
    if (!isIgnored) {
        console.error('🛑 Unhandled Rejection at:', promise, 'reason:', reason);
    }
});

process.on('uncaughtException', (err) => {
    const msg = err?.message || err?.toString() || '';
    const isIgnored = IGNORED_ERRORS.some(e => msg.includes(e));
    if (!isIgnored) {
        console.error('🛑 Uncaught Exception:', err);
    }
});
const makeInMemoryStore = typeof makeInMemoryStoreFunc === 'function' ? makeInMemoryStoreFunc : () => ({
    bind: () => { },
    loadMessage: async () => { },
    writeToFile: () => { },
    readFromFile: () => { },
    assertMessageList: () => ({})
});



// Standard library and dependencies
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const chalk = require('chalk');
const readline = require('readline');
const PhoneNumber = require('awesome-phonenumber');
const NodeCache = require('node-cache');
const express = require('express');

// Memory optimization - Force garbage collection if available
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Garbage collection completed')
    }
}, 60_000) // every 1 minute

// Memory monitoring - Restart if RAM gets too high
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 450) {
        console.log(`⚠️ RAM too high (${used.toFixed(2)}MB), restarting bot...`)
        process.exit(1) // Panel will auto-restart
    }
}, 30_000) // check every 30 seconds


// Global Silencer (Optional: can be disabled if console logs are needed)
function setupSilencer() {
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    const silencePatterns = [
        'Closing open session',
        'Removing old closed session',
        'Replacing old closed session',
        'failed to decrypt message',
        'SessionError',
        'No session record',
        'incoming prekey bundle',
        'SessionEntry',
        'chainKey',
        'ratchetKey',
        'currentRatchet',
        'indexInfo',
        'Bad MAC',
        'Failed to decrypt message'
    ];

    function shouldSilence(args) {
        if (!args || !args.length) return false;
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        return silencePatterns.some(pattern => msg.includes(pattern));
    }

    console.error = (...args) => { if (!shouldSilence(args)) originalConsoleError.apply(console, args); };
    console.log = (...args) => { if (!shouldSilence(args)) originalConsoleLog.apply(console, args); };
    console.warn = (...args) => { if (!shouldSilence(args)) originalConsoleWarn.apply(console, args); };
    console.info = (...args) => { if (!shouldSilence(args)) originalConsoleInfo.apply(console, args); };
}

setupSilencer();

const app = express();
const port = process.env.PORT || 8000;

// Ensure data directory exists
const dataDirPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataDirPath)) {
    try {
        fs.mkdirSync(dataDirPath, { recursive: true });
        console.log('✅ Created data directory');
    } catch (e) {
        console.error('❌ Failed to create data directory:', e.message);
    }
}
try {
    // Try to touch a file to check writability
    const testFile = path.join(dataDirPath, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    // If writable, try to fix permissions for existing files
    const files = fs.readdirSync(dataDirPath);
    files.forEach(file => {
        try {
            fs.chmodSync(path.join(dataDirPath, file), 0o666);
        } catch (e) { }
    });
} catch (e) {
    console.error('⚠️ Warning: Data directory is not writable. Some features may fail.', e.message);
}

const { smsg } = require('./lib/myfunc');
const { isOwner } = require('./lib/ownerCheck');

// Tracker for active schedulers to avoid memory leaks
const sessionIntervals = new Map();
const sentSessionCodes = new Set(); // TRACKER TO PREVENT DUPLICATE SESSION CODE MESSAGES

// Setup Stores & Caches (Shared by ALL sessions can cause conflicts)
// We will move these inside startBot or use a mapping.
const stores = new Map();
const retryCaches = new Map();

// Welcomed users will be handled per socket


// --- PERSISTENT MESSAGE DEDUPLICATION ---
const processedPath = path.join(__dirname, 'data/processed_msgs.json');
let processedMsgsSet = new Set();
try {
    if (fs.existsSync(processedPath)) {
        const data = JSON.parse(fs.readFileSync(processedPath));
        if (Array.isArray(data)) processedMsgsSet = new Set(data);
    }
} catch (e) { }

function saveProcessedMsg(id) {
    try {
        processedMsgsSet.add(id);
        // Keep only the last 1000 message IDs to avoid huge file
        const list = Array.from(processedMsgsSet).slice(-1000);
        fs.writeFileSync(processedPath, JSON.stringify(list));
    } catch (e) { }
}

// --- STARTUP CLEANUP ---
function cleanTempDirectories() {
    console.log(chalk.cyan('🧹 Starting cleanup...'));
    const dirs = ['./tmp', './temp']; // REMOVED ./session
    let deletedCount = 0;

    // 1. Clean Directories
    dirs.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (fs.existsSync(fullPath)) {
            try {
                // If it's session, don't delete creds.json or important keys
                if (dir === './session') {
                    // StartBot handles session clearing if needed, but we can clean garbage here if we want.
                    // Actually, let's NOT touch session here to avoid accidental logout.
                    return;
                }

                const files = fs.readdirSync(fullPath);
                files.forEach(file => {
                    const filePath = path.join(fullPath, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            fs.unlinkSync(filePath);
                            deletedCount++;
                        }
                    } catch (e) {
                        console.error(`Failed to delete ${file}:`, e.message);
                    }
                });
            } catch (err) {
                console.error(`Error cleaning ${dir}:`, err.message);
            }
        } else {
            if (dir !== './session') fs.mkdirSync(fullPath, { recursive: true });
        }
    });

    // 2. Delete .backup files in root
    try {
        const rootFiles = fs.readdirSync(__dirname);
        rootFiles.forEach(file => {
            if (file.endsWith('.backup') || file.endsWith('.tmp')) {
                try {
                    fs.unlinkSync(path.join(__dirname, file));
                    deletedCount++;
                    console.log(chalk.gray(`Deleted backup: ${file}`));
                } catch (e) { }
            }
        });
    } catch (e) { }

    console.log(chalk.green(`✅ Cleanup finished. Removed ${deletedCount} files.`));
}

// Run cleanup immediately
cleanTempDirectories();

// Command Handler (Legacy Support)
// lib/handler.js exports the function directly, so we just require it.
const commandHandler = require('./lib/handler');

// Global Settings
// Ensure pairingCode is true if a number is present in settings
global.phoneNumber = settings.pairingNumber || '';
const pairingCode = !!settings.pairingNumber || !!global.phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");
const sessionDir = './session';
// const msgRetryCounterCache = new NodeCache(); // Moved to per-session

// =================== DASHBOARD & API ROUTES ===================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve dashboard
app.get('/', (req, res) => {
    const dashPath = path.join(__dirname, 'public/index.html');
    if (fs.existsSync(dashPath)) {
        res.sendFile(dashPath);
    } else {
        res.send('Bot is running successfully! 🚀');
    }
});

// GET /api/status — bot status, sessions, settings snapshot
app.get('/api/status', (req, res) => {
    try {
        const sessions = (global.clients || []).map(sock => {
            const user = sock?.user;
            return {
                jid: user?.id || null,
                number: user?.id?.split(':')[0] || null,
                connected: !!user,
                path: sock?._sessionPath || null
            };
        });

        res.json({
            ok: true,
            sessions,
            commandCount: global._commandCount || 566,
            apkLimit: settings.apkLimit || 5,
            settings: {
                botName: settings.botName,
                botOwner: settings.botOwner,
                prefix: settings.prefix,
                commandMode: settings.commandMode,
                timezone: settings.timezone,
                pairingNumber: settings.pairingNumber,
                version: settings.version
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/settings — full settings
app.get('/api/settings', (req, res) => {
    try {
        const s = require('./settings');
        res.json({ ...s, apkLimit: s.apkLimit || 5 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/settings — write settings.js
app.post('/api/settings', (req, res) => {
    try {
        const settingsPath = path.join(__dirname, 'settings.js');
        let src = fs.readFileSync(settingsPath, 'utf-8');

        const strFields = [
            'botName', 'botOwner', 'prefix', 'commandMode', 'timezone',
            'pairingNumber', 'AUTO_STATUS_REACT', 'AUTO_STATUS_REPLY', 'AUTO_STATUS_MSG',
            'AUTORECORD', 'AUTOTYPE', 'AUTORECORDTYPE', 'instagram', 'instagram2', 'instagramChannel',
            'facebook', 'facebookPage', 'youtube', 'telegram', 'waGroups', 'portfolio',
            'officialChannel', 'packname', 'author', 'newsletterName', 'newsletterJid',
            'giphyApiKey', 'hfToken', 'supabaseUrl', 'supabaseKey', 'telegramToken',
            'fbPageAccessToken', 'fbPageId', 'description'
        ];

        const arrFields = ['ownerNumber', 'extraNumbers'];

        for (const key of strFields) {
            if (req.body[key] !== undefined) {
                const val = req.body[key].replace(/'/g, "\\'");
                src = src.replace(
                    new RegExp(`(^\\s*${key}\\s*:\\s*)(.+?)(,?\\s*$)`, 'm'),
                    `$1'${val}'$3`
                );
            }
        }

        for (const key of arrFields) {
            if (req.body[key] !== undefined && Array.isArray(req.body[key])) {
                const arrStr = JSON.stringify(req.body[key]);
                src = src.replace(
                    new RegExp(`(${key}\\s*:\\s*)\\[[^\\]]*\\]`),
                    `$1${arrStr}`
                );
            }
        }

        fs.writeFileSync(settingsPath, src, 'utf-8');

        // Update the cached settings object in memory so all files importing it get the new settings instantly!
        try {
            const currentSettings = require('./settings');
            for (const key of strFields) {
                if (req.body[key] !== undefined) {
                    currentSettings[key] = req.body[key];
                }
            }
            for (const key of arrFields) {
                if (req.body[key] !== undefined && Array.isArray(req.body[key])) {
                    currentSettings[key] = req.body[key];
                }
            }
            // Keep global variables in sync as well
            if (req.body.pairingNumber !== undefined) {
                global.phoneNumber = req.body.pairingNumber;
            }
        } catch (e) {
            console.error('Failed to update in-memory settings:', e.message);
        }

        // Invalidate require cache so next read gets fresh data
        delete require.cache[require.resolve('./settings')];

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/apk-limit — update daily APK limit
app.post('/api/apk-limit', (req, res) => {
    try {
        const limit = parseInt(req.body.limit);
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ success: false, error: 'قيمة غير صالحة' });
        }

        // Save to settings.js file
        const settingsPath = path.join(__dirname, 'settings.js');
        let src = fs.readFileSync(settingsPath, 'utf-8');

        if (src.includes('apkLimit:')) {
            src = src.replace(/(apkLimit\s*:\s*)(\d+)/, `$1${limit}`);
        } else {
            // Insert it right after settings declaration
            src = src.replace(/(const settings = \{)/, `$1\n  apkLimit: ${limit},`);
        }
        fs.writeFileSync(settingsPath, src, 'utf-8');

        // Update in-memory cache
        try {
            const currentSettings = require('./settings');
            currentSettings.apkLimit = limit;
        } catch (e) {}

        delete require.cache[require.resolve('./settings')];

        res.json({ success: true, limit });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/pair — request a WhatsApp pairing code for a number
app.post('/api/pair', async (req, res) => {
    try {
        const { number } = req.body;
        if (!number || !/^\d{10,15}$/.test(number)) {
            return res.status(400).json({ success: false, error: 'رقم غير صالح' });
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        // 1. Determine if this number is already active
        const existingSock = (global.clients || []).find(c => {
            const userNum = c?.user?.id?.split(':')[0] || (c?.sessionPath ? path.basename(c.sessionPath).replace('session_', '') : null);
            return userNum === cleanNumber;
        });

        if (existingSock && existingSock.user) {
            return res.status(400).json({ success: false, error: 'هذا الرقم متصل بالفعل' });
        }

        // Determine session path
        const isCore = cleanNumber === settings.pairingNumber;
        const sessionPath = isCore ? sessionDir : path.join(sessionsRoot, `session_${cleanNumber}`);

        // If a socket is already active for this path, we can reuse or stop it first
        const activeClient = (global.clients || []).find(c => c.sessionPath === sessionPath);
        if (activeClient) {
            // Close active client if not registered to allow fresh pairing attempt
            if (!activeClient.user) {
                try {
                    activeClient.end();
                } catch (e) {}
                global.clients = global.clients.filter(c => c.sessionPath !== sessionPath);
            } else {
                return res.status(400).json({ success: false, error: 'هذا الرقم لديه جلسة نشطة بالفعل' });
            }
        }

        // Clear any previous code for this number
        global.pendingPairingCodes = global.pendingPairingCodes || {};
        delete global.pendingPairingCodes[cleanNumber];

        // Reset last request time to bypass the 120s check
        global.lastPairingRequestTime = global.lastPairingRequestTime || {};
        delete global.lastPairingRequestTime[sessionPath];

        // Start the bot session in background
        console.log(`[API/Pair] Starting session for ${cleanNumber} at ${sessionPath}`);
        startBot(sessionPath, cleanNumber).catch(err => {
            console.error(`[API/Pair] startBot error for ${cleanNumber}:`, err.message);
        });

        // Poll for the code to be generated (max 25 seconds)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 500ms = 25 seconds
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 500));
            if (global.pendingPairingCodes[cleanNumber]) {
                const { code } = global.pendingPairingCodes[cleanNumber];
                console.log(`[API/Pair] Code successfully retrieved for ${cleanNumber}: ${code}`);
                return res.json({ success: true, code, number: cleanNumber });
            }
            attempts++;
        }

        return res.status(504).json({ success: false, error: 'انتهت مهلة طلب الكود. يرجى المحاولة مرة أخرى.' });
    } catch (e) {
        console.error('[API] Pair error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/pair-cancel — cancel a pending pairing process
app.post('/api/pair-cancel', async (req, res) => {
    try {
        const { number } = req.body;
        if (!number) {
            return res.status(400).json({ success: false, error: 'رقم غير صالح' });
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');
        const sessionPath = cleanNumber === settings.pairingNumber ? sessionDir : path.join(sessionsRoot, `session_${cleanNumber}`);

        // Find the active client socket for this session path
        const activeClient = (global.clients || []).find(c => c.sessionPath === sessionPath);
        if (activeClient) {
            try {
                activeClient.end();
            } catch (e) {}
            global.clients = global.clients.filter(c => c.sessionPath !== sessionPath);
        }

        // Delete the session folder if it has no creds or is unregistered
        const credsFile = path.join(sessionPath, 'creds.json');
        const credsExist = fs.existsSync(credsFile);
        
        let isRegistered = false;
        if (credsExist) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
                isRegistered = !!creds.registered;
            } catch (e) {}
        }

        // If it was not successfully registered/paired, clean it up!
        if (!isRegistered && fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`[API/Pair-Cancel] Cleaned up unregistered session: ${sessionPath}`);
        }

        // Remove from pending pairing codes
        if (global.pendingPairingCodes) {
            delete global.pendingPairingCodes[cleanNumber];
        }

        res.json({ success: true, message: 'تم إلغاء طلب الإقران وتنظيف الجلسة بنجاح' });
    } catch (e) {
        console.error('[API] Cancel error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/restart — graceful process exit (host auto-restarts)
app.post('/api/restart', (req, res) => {
    res.json({ success: true, message: 'جاري إعادة التشغيل...' });
    setTimeout(() => process.exit(0), 500);
});

// GET /api/users — list all registered users and banned list
app.get('/api/users', (req, res) => {
    try {
        const usersPath = path.join(__dirname, 'data/users.json');
        const bannedPath = path.join(__dirname, 'data/banned.json');
        let users = [], banned = [];
        try { users = JSON.parse(fs.readFileSync(usersPath, 'utf-8')); } catch(e) { users = []; }
        try { banned = JSON.parse(fs.readFileSync(bannedPath, 'utf-8')); } catch(e) { banned = []; }
        const activeCount = global._activeUsers ? global._activeUsers.size : 0;
        res.json({ ok: true, users, banned, activeCount, total: users.length });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/ban — ban a user
app.post('/api/ban', (req, res) => {
    try {
        const { number } = req.body;
        if (!number) return res.status(400).json({ ok: false, error: 'رقم مطلوب' });
        const bannedPath = path.join(__dirname, 'data/banned.json');
        let banned = [];
        try { banned = JSON.parse(fs.readFileSync(bannedPath, 'utf-8')); } catch(e) { banned = []; }
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        if (!banned.includes(jid)) banned.push(jid);
        fs.writeFileSync(bannedPath, JSON.stringify(banned, null, 2));
        if (global._bannedUsers) global._bannedUsers = new Set(banned);
        res.json({ ok: true, message: 'تم حظر المستخدم بنجاح' });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/unban — unban a user
app.post('/api/unban', (req, res) => {
    try {
        const { number } = req.body;
        if (!number) return res.status(400).json({ ok: false, error: 'رقم مطلوب' });
        const bannedPath = path.join(__dirname, 'data/banned.json');
        let banned = [];
        try { banned = JSON.parse(fs.readFileSync(bannedPath, 'utf-8')); } catch(e) { banned = []; }
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        banned = banned.filter(b => b !== jid);
        fs.writeFileSync(bannedPath, JSON.stringify(banned, null, 2));
        if (global._bannedUsers) global._bannedUsers = new Set(banned);
        res.json({ ok: true, message: 'تم رفع الحظر بنجاح' });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cmd-stats — command usage statistics
app.get('/api/cmd-stats', (req, res) => {
    try {
        const { ALL_COMMANDS } = require('./lib/commandMap');
        const stats = global._cmdStats || {};
        // Unique command files (deduplicated)
        const cmdFiles = [...new Set(Object.values(ALL_COMMANDS))];
        const unusedFiles = cmdFiles.filter(f => {
            const cmdsForFile = Object.entries(ALL_COMMANDS).filter(([,v]) => v === f).map(([k]) => k);
            return !cmdsForFile.some(c => stats[c]);
        });
        const topCommands = Object.entries(stats)
            .sort((a,b) => b[1]-a[1])
            .slice(0, 20)
            .map(([cmd, count]) => ({ cmd, count }));
        res.json({
            ok: true,
            total: cmdFiles.length,
            usedCount: cmdFiles.length - unusedFiles.length,
            unusedCount: unusedFiles.length,
            unusedFiles,
            topCommands,
            stats
        });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/activity — recent bot activity log (last 50)
app.get('/api/activity', (req, res) => {
    try {
        const log = (global._activityLog || []).slice(0, 50);
        res.json({ ok: true, log });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/broadcast — send message to all registered users
app.post('/api/broadcast', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ ok: false, error: 'رسالة مطلوبة' });
        const usersPath = path.join(__dirname, 'data/users.json');
        let users = [];
        try { users = JSON.parse(fs.readFileSync(usersPath, 'utf-8')); } catch(e) {}
        const clients = global.clients || [];
        if (!clients.length) return res.status(503).json({ ok: false, error: 'لا توجد جلسات متصلة' });
        const sock = clients.find(c => c?.user) || clients[0];
        let sent = 0, failed = 0;
        for (const user of users) {
            try {
                const jid = user.id || user.jid;
                if (!jid || jid === 'test@s.whatsapp.net') continue;
                await sock.sendMessage(jid, { text: message });
                sent++;
                await new Promise(r => setTimeout(r, 500));
            } catch(e) { failed++; }
        }
        res.json({ ok: true, sent, failed, total: users.length });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.listen(port, () => {

    console.log(`Port ${port} is open`);

    // Keep-Alive Self-Ping (to prevent sleeping on Koyeb Eco)
    const publicDomain = process.env.KOYEB_PUBLIC_DOMAIN || process.env.DOMAIN_URL;
    if (publicDomain) {
        setInterval(async () => {
            try {
                const axios = require('axios');
                const url = publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`;
                await axios.get(url);
            } catch (e) { }
        }, 3 * 60 * 1000);
    }
});

// Readline Interface for interactive input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// --- SESSION SYNC LOGIC ---
// --- SESSION SYNC LOGIC ---
async function restoreSession(sessionString, targetDir) {
    if (!sessionString) return;
    try {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // Check if creds.json already exists to prevent overwriting with old session data
        if (fs.existsSync(path.join(targetDir, 'creds.json'))) {
            console.log(chalk.yellow(`⚠️ creds.json already exists in ${path.basename(targetDir)}. Skipping sync.`));
            return;
        }

        // Format: Session~<base64_encoded_creds>
        const encodedData = sessionString.split('Session~')[1] || sessionString;
        const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
        const creds = JSON.parse(decodedData);

        fs.writeFileSync(path.join(targetDir, 'creds.json'), JSON.stringify(creds, null, 2));
        console.log(chalk.green(`✅ Session successfully restored to ${path.basename(targetDir)}`));
    } catch (e) {
        console.error(`❌ Failed to restore session to ${targetDir}:`, e.message);
    }
}

async function syncSession() {
    // 1. Main Session (SESSION_ID) -> ./session
    if (process.env.SESSION_ID) {
        console.log(chalk.cyan('🔄 SESSION_ID detected...'));
        await restoreSession(process.env.SESSION_ID, sessionDir);
    }

    // 2. Multi-Sessions (SESSION_2, SESSION_3...) -> ./sessions/session_X
    const extraSessions = Object.keys(process.env).filter(key => key.startsWith('SESSION_') && key !== 'SESSION_ID');

    if (extraSessions.length > 0) {
        console.log(chalk.cyan(`🔄 Found ${extraSessions.length} extra sessions in Env Vars...`));
        const sessionsRoot = path.join(__dirname, 'sessions');

        for (const key of extraSessions) {
            // SESSION_2 -> sessions/session_2
            const folderName = key.toLowerCase();
            const targetPath = path.join(sessionsRoot, folderName);
            await restoreSession(process.env[key], targetPath);
        }
    }
}

// --- MULTI-SESSION LOGIC ---
global.clients = [];
const sessionsRoot = path.join(__dirname, 'sessions');

async function getSessionPaths() {
    const paths = [];

    // 1. Check Legacy Session
    if (fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0) {
        paths.push({ path: sessionDir, name: 'Default' });
    }

    // 2. Check Multi-Sessions
    if (fs.existsSync(sessionsRoot)) {
        const folders = fs.readdirSync(sessionsRoot);
        folders.forEach(folder => {
            const p = path.join(sessionsRoot, folder);
            if (fs.statSync(p).isDirectory()) {
                paths.push({ path: p, name: folder });
            }
        });
    }
    return paths;
}


async function startBot(sessionPath = sessionDir, phoneNumber = null) {
    // Avoid double start for same session
    if (global.clients.find(c => c.sessionPath === sessionPath)) return;

    console.log(chalk.blue(`🚀 Initializing session: ${sessionPath}...`));

    // --- SESSION-SPECIFIC STORE & CACHE ---
    if (!stores.has(sessionPath)) {
        stores.set(sessionPath, makeInMemoryStore({
            logger: pino({ level: 'silent' }).child({ level: 'silent', factory: 'WA.Store' })
        }));
    }
    const store = stores.get(sessionPath);

    if (!retryCaches.has(sessionPath)) {
        retryCaches.set(sessionPath, new NodeCache());
    }
    const msgRetryCounterCache = retryCaches.get(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: !pairingCode,
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        getMessage: async (key) => {
            const jid = Baileys.jidNormalizedUser(key.remoteJid);
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || { conversation: settings.botName || 'Hamza Amirni' };
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: 180000,
        connectTimeoutMs: 180000,
        keepAliveIntervalMs: 30000,
        fireInitQueries: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false, // Disables historical chat syncing to save CPU and RAM
        markOnlineOnConnect: false,
        emitOwnEvents: true,
        generateHighQualityLinkPreview: true,
    });

    // Attach session path for identification
    sock.sessionPath = sessionPath;
    if (!global.clients.find(c => c.sessionPath === sessionPath)) {
        global.clients.push(sock);
    }

    // Helper: Decode JID
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    // Store binding
    store.bind(sock.ev);

    // Determine pairing needs specifically for THIS socket
    const credsExist = fs.existsSync(path.join(sessionPath, 'creds.json'));

    // Check if there is an env variable for this session to skip pairing
    const sessionEnvVarName = (sessionPath === sessionDir || sessionPath === './session') ? 'SESSION_ID' : path.basename(sessionPath).toUpperCase();
    const hasSessionVar = !!process.env[sessionEnvVarName] && process.env[sessionEnvVarName].length > 10;

    // Determine the phone number to use for this session upfront
    let pNum = phoneNumber;
    if (!pNum) {
        const basename = path.basename(sessionPath);
        if (sessionPath.includes('sessions') && /^\d+$/.test(basename)) {
            pNum = basename;
        } else if (basename.toLowerCase().startsWith('session_')) {
            const envVarName = `${basename.toUpperCase()}_NUMBER`;
            pNum = process.env[envVarName] || null;
        } else if (sessionPath === sessionDir || sessionPath === './session') {
            pNum = settings.pairingNumber;
        } else {
            pNum = null;
        }
    }

    // If session var exists, we don't need pairing code (it should connect from var)
    const needsPairing = !hasSessionVar && (!credsExist || !sock.authState.creds.registered) && !!pNum;

    // Pairing Code Flow
    if (needsPairing && !sock.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api');

        if (pNum) pNum = pNum.replace(/[^0-9]/g, '');

        if (pNum) {
            // Throttling logic: check if a code was requested in the last 120 seconds for this sessionPath
            global.lastPairingRequestTime = global.lastPairingRequestTime || {};
            const lastRequest = global.lastPairingRequestTime[sessionPath] || 0;
            const now = Date.now();
            if (now - lastRequest < 120_000) {
                console.log(chalk.yellow(`\n⚠️ [${sessionPath}] A pairing code was recently requested. Skipping to avoid rate limits.`));
                console.log(chalk.yellow(`   Please wait at least 2 minutes between attempts or check logs above for the code.\n`));
                return;
            }

            // Wait to ensure socket is ready before requesting code
            await delay(5000);
            try {
                // Double check if registered after delay (it might have connected)
                if (!sock.authState.creds.registered) {
                    // Update timestamp right before requesting to prevent duplicate race conditions
                    global.lastPairingRequestTime[sessionPath] = Date.now();

                    let code = await sock.requestPairingCode(pNum);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;

                    // Save code to global storage for API retrieval
                    global.pendingPairingCodes = global.pendingPairingCodes || {};
                    global.pendingPairingCodes[pNum] = { code, timestamp: Date.now() };

                    console.log(chalk.black(chalk.bgGreen(`🚀 Requesting Pairing Code for: ${pNum}...`)));
                    console.log(chalk.bold.green(`
===================================================
🔑 YOUR PAIRING CODE FOR ${pNum}:
👉  ${code}  👈
===================================================
`));
                    console.log(chalk.cyan(`\n💡 If NO notification appears on your phone:`));
                    console.log(chalk.white(`   1. Open WhatsApp -> Linked Devices`));
                    console.log(chalk.white(`   2. Tap 'Link a Device'`));
                    console.log(chalk.white(`   3. Tap 'Link with phone number instead' at the bottom`));
                    console.log(chalk.white(`   4. Enter the code shown above: ${code}`));
                }
            } catch (e) {
                console.error('Error requesting pairing code:', e.message);
            }
        }
    }

    // Add to global clients
    global.clients.push(sock);

    // Backward compatibility: Set global.sock to the FIRST connected bot
    if (!global.sock) global.sock = sock;

    // --- CONNECTION HANDLERS ---
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(chalk.green(`\n🌿 [${sessionPath}] Connected => ${sock.user?.id}`));

            // Automatically add new connected session to extraNumbers in settings.js if not already present
            try {
                const connectedNumber = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0];
                if (connectedNumber && connectedNumber !== settings.pairingNumber) {
                    if (!settings.extraNumbers.includes(connectedNumber)) {
                        console.log(chalk.green(`[${sessionPath}] Auto-adding new connected number ${connectedNumber} to extraNumbers`));
                        settings.extraNumbers.push(connectedNumber);
                        const settingsPath = path.join(__dirname, 'settings.js');
                        let src = fs.readFileSync(settingsPath, 'utf-8');
                        const arrStr = JSON.stringify(settings.extraNumbers);
                        src = src.replace(
                            new RegExp(`(extraNumbers\\s*:\\s*)\\[[^\\]]*\\]`),
                            `$1${arrStr}`
                        );
                        fs.writeFileSync(settingsPath, src, 'utf-8');
                        delete require.cache[require.resolve('./settings')];
                    }
                }
            } catch (e) {
                console.error('Failed to auto-save extraNumbers:', e.message);
            }

            // Send Session Code to Owner upon connection (Limit to once per session path per run)
            const sessionEnvVarName = sessionPath === sessionDir ? 'SESSION_ID' : `SESSION_${path.basename(sessionPath)}`;
            const markerFile = path.join(sessionPath, '.session_code_sent');

            if (!process.env[sessionEnvVarName] && !sentSessionCodes.has(sessionPath) && !fs.existsSync(markerFile)) {
                setTimeout(async () => {
                    try {
                        // Re-check if connected and valid
                        if (sentSessionCodes.has(sessionPath) || !sock.user || fs.existsSync(markerFile)) return;

                        const credsFile = path.join(sessionPath, 'creds.json');
                        if (fs.existsSync(credsFile)) {
                            const credsData = fs.readFileSync(credsFile, 'utf-8');
                            const base64Creds = Buffer.from(credsData).toString('base64');
                            const sessionString = `Session~${base64Creds}`;
                            const msgText = `✅ *تم التسجيل بنجاح!*\n\nهذا هو كود الجلسة (Session Code) الخاص بهذا الرقم (${sessionPath}). يرجى نسخه ووضعه في متغيّر البيئة \`${sessionEnvVarName}\` في Koyeb لضمان استقرار البوت:\n\n\`\`\`${sessionString}\`\`\``;

                            // 1. Send to self (Bot's own number)
                            const myNumber = sock.decodeJid(sock.user.id);

                            // Check if socket is still active before sending
                            try {
                                await sock.sendMessage(myNumber, { text: msgText });

                                // 2. Send to the Main Owner as backup
                                const mainOwners = Array.isArray(settings.ownerNumber) ? settings.ownerNumber : [settings.ownerNumber];
                                const mainOwner = mainOwners[0] + '@s.whatsapp.net';
                                if (mainOwner !== myNumber) {
                                    await sock.sendMessage(mainOwner, { text: msgText });
                                }
                                sentSessionCodes.add(sessionPath);
                                try { fs.writeFileSync(markerFile, 'sent'); } catch (e) { }
                                console.log(chalk.green(`✅ Session code sent to private chat of ${myNumber} and Owner`));
                            } catch (e) {
                                // Socket might have closed during the sequence
                            }
                        }
                    } catch (err) {
                        console.error('Failed to send session code:', err.message);
                    }
                }, 15000); // 15s delay to ensure connection is fully established
            }

            // Re-assign global.sock if it was closed or missing to ensure at least one active
            if (!global.sock || global.sock.isClosed) global.sock = sock;

            // Start Background Services (Schedulers)
            setTimeout(() => {
                if (!sock.user) return;

                // Stop old intervals for THIS session path to avoid duplicates
                if (sessionIntervals.has(sessionPath)) {
                    sessionIntervals.get(sessionPath).forEach(id => clearInterval(id));
                }
                const currentIntervals = [];

                try {
                    const ad3iyaJob = require('./commands/islamic/ad3iya').startScheduler(sock);
                    if (ad3iyaJob) currentIntervals.push(ad3iyaJob);
                } catch (e) { }
                try {
                    const salatJob = require('./commands/islamic/salat').startPrayerScheduler(sock);
                    if (salatJob) currentIntervals.push(salatJob);
                } catch (e) { }
                try {
                    const groupJob = require('./lib/groupScheduler').startScheduler(sock);
                    if (groupJob) currentIntervals.push(groupJob);
                } catch (e) { }

                try {
                    const ramadanJob = require('./lib/ramadanScheduler').startRamadanScheduler(sock);
                    if (ramadanJob) currentIntervals.push(ramadanJob);
                } catch (e) { }

                try {
                    const reminderInterval = setInterval(() => {
                        const { checkAndSendReminder } = require('./commands/group/autoreminder');
                        checkAndSendReminder(sock);
                    }, 60000);
                    currentIntervals.push(reminderInterval);
                } catch (e) { }

                sessionIntervals.set(sessionPath, currentIntervals);
            }, 10000); // 10s delay to let connection settle
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error?.output?.statusCode) || (lastDisconnect?.error?.code);
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

            console.log(chalk.red(`❌ [${sessionPath}] Connection closed. Reason: ${statusCode}. Reconnecting: ${shouldReconnect}`));

            // Remove from clients array
            global.clients = global.clients.filter(c => c.sessionPath !== sessionPath);
            if (global.sock === sock) global.sock = global.clients[0] || null;

            if (!global.retryCount) global.retryCount = {};
            global.retryCount[sessionPath] = (global.retryCount[sessionPath] || 0) + 1;

            // Cleanup Intervals/Cron Jobs on Close
            if (sessionIntervals.has(sessionPath)) {
                sessionIntervals.get(sessionPath).forEach(job => {
                    if (job && typeof job.stop === 'function') job.stop(); // Cron job
                    else if (job) clearInterval(job); // Interval
                });
                sessionIntervals.delete(sessionPath);
            }

            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(chalk.red(`⚠️ Session ${sessionPath} logged out. Deleted credentials.`));

                // Remove from extraNumbers in settings.js if logged out
                try {
                    const loggedOutNumber = path.basename(sessionPath).replace('session_', '');
                    if (settings.extraNumbers.includes(loggedOutNumber)) {
                        settings.extraNumbers = settings.extraNumbers.filter(n => n !== loggedOutNumber);
                        const settingsPath = path.join(__dirname, 'settings.js');
                        let src = fs.readFileSync(settingsPath, 'utf-8');
                        const arrStr = JSON.stringify(settings.extraNumbers);
                        src = src.replace(
                            new RegExp(`(extraNumbers\\s*:\\s*)\\[[^\\]]*\\]`),
                            `$1${arrStr}`
                        );
                        fs.writeFileSync(settingsPath, src, 'utf-8');
                        delete require.cache[require.resolve('./settings')];
                        console.log(chalk.red(`⚠️ Removed logged out number ${loggedOutNumber} from settings.extraNumbers`));
                    }
                } catch (e) { }
            } else if (statusCode === 440 || statusCode === 428) {
                // ⚠️ 428 = connection replaced / server-side drop, 440 = conflict
                // These are TRANSIENT errors on Koyeb — NEVER delete credentials for them.
                // If we've retried many times, back off longer but keep credentials intact.
                if (global.retryCount[sessionPath] > 12) {
                    // Reset counter so we don't keep backing off forever
                    global.retryCount[sessionPath] = 0;
                    const retryDelay = 60000 + Math.floor(Math.random() * 30000);
                    console.log(chalk.yellow(`⚠️ [${sessionPath}] High retry count for ${statusCode}. Resetting counter & backing off ${Math.round(retryDelay / 1000)}s (credentials kept safe).`));
                    setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
                } else if (statusCode === 440) {
                    const retryDelay = 45000 + Math.floor(Math.random() * 20000);
                    console.log(chalk.cyan(`Conflict (440), reconnecting in ${Math.round(retryDelay / 1000)}s to avoid loop...`));
                    setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
                } else {
                    const retryDelay = 28000 + Math.floor(Math.random() * 12000);
                    console.log(chalk.yellow(`Connection closed (428), retrying in ${Math.round(retryDelay / 1000)}s...`));
                    setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
                }
            } else if (statusCode === 408 || statusCode === DisconnectReason.connectionLost) {
                const retryDelay = 30000 + Math.floor(Math.random() * 15000);
                console.log(chalk.yellow(`Connection lost (408), retrying in ${Math.round(retryDelay / 1000)}s...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
            } else if (statusCode === 500 || statusCode === DisconnectReason.connectionClosed) {
                const retryDelay = 25000 + Math.floor(Math.random() * 10000);
                console.log(chalk.yellow(`Connection closed (500), retrying in ${Math.round(retryDelay / 1000)}s...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
            } else if (statusCode === DisconnectReason.restartRequired) {
                console.log(chalk.cyan(`[${sessionPath}] Restart required (515), reconnecting immediately...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), 1000);
            } else if (shouldReconnect) {
                setTimeout(() => startBot(sessionPath, phoneNumber), 15000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- MESSAGE HANDLER ---
    if (!global.processedMessages) global.processedMessages = new NodeCache({ stdTTL: 600, checkperiod: 60 });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            let msg = chatUpdate.messages[0];
            if (!msg.message) return;

            // 🕒 FILTER OLD MESSAGES
            const currentTime = Math.floor(Date.now() / 1000);
            if (msg.messageTimestamp < currentTime - 180) return;

            // 🛡️ PREVENT DUPLICATES (Persistent & Per Bot Instance)
            const myBotNumber = sock.user?.id?.split(':')[0] || 'bot';
            const msgId = `${myBotNumber}_${msg.key.id}`;
            if (processedMsgsSet.has(msgId)) return;
            saveProcessedMsg(msgId);

            // Serialize message
            msg = smsg(sock, msg, store);

            // 1. Auto Status View
            if (msg.key.remoteJid === 'status@broadcast') {
                try {
                    const { handleStatusUpdate } = require('./commands/group/autostatus');
                    await handleStatusUpdate(sock, msg);
                } catch (e) { }
                return;
            }

            // 2. AntiDelete Store
            try {
                const { storeMessage } = require('./commands/group/antidelete');
                await storeMessage(sock, msg);
            } catch (e) { }

            // 3. AutoWelcome
            if (msg.key.remoteJid && !msg.key.remoteJid.endsWith('@g.us') && !msg.key.fromMe) {
                const { isOwner } = require('./lib/ownerCheck');
                const isUserOwner = isOwner(msg);

                const { getBotMode } = require('./commands/owner/mode');
                const currentMode = getBotMode();

                // Don't welcome in Private if in Group-Only or Self mode (unless owner)
                if ((currentMode === 'groups' || currentMode === 'self') && !isUserOwner) {
                    // pass
                } else {
                    const { readState: readPmState } = require('./commands/group/pmblocker');
                    const pmState = readPmState();
                    const { loadAutoWelcomeState } = require('./commands/group/autowelcome');

                    if (loadAutoWelcomeState() && !pmState.enabled) {
                        const botId = sock.user?.id?.split(':')[0] || 'bot';
                        const welcomedPath = path.join(__dirname, `data/welcomed_${botId}.json`);

                        if (!sock.welcomedUsers) {
                            try {
                                if (fs.existsSync(welcomedPath)) {
                                    sock.welcomedUsers = new Set(JSON.parse(fs.readFileSync(welcomedPath)));
                                } else {
                                    sock.welcomedUsers = new Set();
                                }
                            } catch (e) { sock.welcomedUsers = new Set(); }
                        }

                        if (!sock.welcomedUsers.has(msg.key.remoteJid)) {
                            // Send Welcome
                            const welcomeText = `مرحباً بك يا @${msg.key.remoteJid.split('@')[0]} في عالم ${settings.botName} ⚔️\n\nللإطلاع على الأوامر: ${settings.prefix}menu`;
                            await sock.sendMessage(msg.key.remoteJid, { text: welcomeText, mentions: [msg.key.remoteJid] });

                            sock.welcomedUsers.add(msg.key.remoteJid);
                            fs.writeFileSync(welcomedPath, JSON.stringify(Array.from(sock.welcomedUsers)));

                            // Auto-subscribe
                            try { require('./commands/islamic/ad3iya').autoSubscribe(sock, msg.key.remoteJid); } catch (e) { }
                            try { require('./commands/islamic/salat').autoSubscribe(sock, msg.key.remoteJid); } catch (e) { }
                        }
                    }
                }
            }

            // 4. Main Command Handler
            if (typeof commandHandler === 'function') {
                await commandHandler(sock, msg);
            } else if (commandHandler && typeof commandHandler.handleMessage === 'function') {
                await commandHandler.handleMessage(sock, msg);
            }
        } catch (e) { console.error(e); }
    });

    // Antidelete Revocation Hook
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.protocolMessage?.type === 0 || update.update.protocolMessage?.type === 14) {
                try {
                    const { handleMessageRevocation } = require('./commands/group/antidelete');
                    await handleMessageRevocation(sock, update);
                } catch (e) { }
            }
        }
    });

    // Group Participants Update Hook
    sock.ev.on('group-participants.update', async (anu) => {
        const { id, participants, action, author } = anu;
        try {
            if (action === 'promote') {
                const { handlePromotionEvent } = require('./commands/group/promote');
                if (handlePromotionEvent) await handlePromotionEvent(sock, id, participants, author);
            } else if (action === 'demote') {
                const { handleDemotionEvent } = require('./commands/group/demote');
                if (handleDemotionEvent) await handleDemotionEvent(sock, id, participants, author);
            }
        } catch (e) { console.error('Group Event Error:', e); }
    });

    // Anticall implementation
    sock.ev.on('call', async (call) => {
        const { readState } = require('./commands/group/anticall');
        const state = readState();
        if (state.enabled) {
            for (const c of call) {
                if (c.status === 'offer') {
                    await sock.rejectCall(c.id, c.from);
                    if (state.action === 'block') {
                        const cleanCaller = sock.decodeJid(c.from);
                        await sock.updateBlockStatus(cleanCaller, 'block').catch(() => { });
                    }
                }
            }
        }
    });

    return sock;
}

// --- MAIN ENTRY POINT ---
(async () => {
    // Restore session credentials from Environment Variables (SESSION_ID, SESSION_2, etc.)
    await syncSession();

    console.log(chalk.cyan(`\n🚀 Starting bot multi-session manager...`));

    // Unified Session Gathering with Smart Deduplication by Phone Number
    const numberToPathMap = new Map(); // Key: Phone Number, Value: Object { path, pNum }
    const pendingPaths = []; // Folders with no identified number yet

    // Helper to normalize numbers (Strict)
    const norm = (n) => {
        if (!n) return null;
        let cleaned = n.toString().split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return cleaned.length >= 10 ? cleaned : null;
    };

    // Helper to peek into session folder
    const getNumFromFolder = (folder) => {
        try {
            const credsP = path.join(folder, 'creds.json');
            if (fs.existsSync(credsP)) {
                const creds = JSON.parse(fs.readFileSync(credsP));
                const num = norm(creds.me?.id || creds.me?.jid);
                if (num) return num;
            }
        } catch (e) { }
        return null;
    };

    // Gather all potential sources
    const allSources = [];

    // 1. Scan existing folders
    const existing = await getSessionPaths();
    existing.forEach(ex => allSources.push({ path: ex.path, name: ex.name }));

    // 2. Add Core Session from Settings
    const coreNum = norm(settings.pairingNumber);
    if (coreNum) allSources.push({ path: sessionDir, pNum: coreNum, name: 'Default' });

    // 3. Add Extra Numbers from Settings
    if (Array.isArray(settings.extraNumbers)) {
        settings.extraNumbers.forEach(num => {
            const clean = norm(num);
            if (clean) allSources.push({ path: path.join(sessionsRoot, clean), pNum: clean, name: clean });
        });
    }

    // Process all sources into the unique Number-to-Path Map
    for (const source of allSources) {
        const fullPath = path.resolve(source.path);
        const folderNum = getNumFromFolder(source.path);
        const effectiveNum = folderNum || source.pNum || norm(/^\d+$/.test(source.name) ? source.name : null);

        if (effectiveNum) {
            // Priority: If multiple paths claim the same number, we only keep the first one
            // This prevents starting two sessions for the same account, which causes 440 Conflict errors.
            if (!numberToPathMap.has(effectiveNum)) {
                numberToPathMap.set(effectiveNum, { path: source.path, pNum: effectiveNum });
            }
        } else {
            // If no number yet, keep as pending folder (new pairing)
            if (!pendingPaths.find(p => path.resolve(p.path) === fullPath)) {
                pendingPaths.push({ path: source.path, pNum: null });
            }
        }
    }

    // Merge unique numbers and pending paths
    const finalPaths = [...Array.from(numberToPathMap.values()), ...pendingPaths];

    // Final check: filter out duplicates by path
    const uniqueByPath = [];
    const seenAbsPaths = new Set();
    for (const s of finalPaths) {
        const abs = path.resolve(s.path);
        if (!seenAbsPaths.has(abs)) {
            uniqueByPath.push(s);
            seenAbsPaths.add(abs);
        }
    }

    console.log(chalk.cyan(`\n🔄 Found ${uniqueByPath.length} unique sessions to initialize...`));

    for (const s of uniqueByPath) {
        try {
            await startBot(s.path, s.pNum);
            await delay(15000); // Wait between sessions
        } catch (e) {
            console.error(`Failed to start session (${s.path}):`, e.message);
        }
    }
})();
