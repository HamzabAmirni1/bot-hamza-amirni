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
const makeInMemoryStore = typeof makeInMemoryStoreFunc === 'function' ? makeInMemoryStoreFunc : () => ({
    bind: () => { },
    loadMessage: async () => { },
    writeToFile: () => { },
    readFromFile: () => { },
    assertMessageList: () => ({})
});



// Persistent fallback to prevent crash
// Persistent fallback to prevent crash
// Baileys Store Fix - Direct Path Import
// let makeInMemoryStore; // Already declared at the top
// Cleaning up index.js...





// All store reassignments removed to avoid const error.

// Cleaned up.


// Store check completed

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
    if (used > 400) {
        console.log('⚠️ RAM too high (>400MB), restarting bot...')
        process.exit(1) // Panel will auto-restart
    }
}, 30_000) // check every 30 seconds


// Filter console logs to suppress specific Baileys decryption and session noise
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

const silencePatterns = [
    'Bad MAC',
    'Session error',
    'Failed to decrypt',
    'Closing session',
    'Closing open session',
    'Conflict',
    'Stream Errored',
    'Removing old closed session',
    'Replacing old closed session'
];

function shouldSilence(args) {
    if (!args || !args.length) return false;
    // Check if any argument matches the silence patterns
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');

    return silencePatterns.some(pattern => msg.includes(pattern));
}

console.error = function (...args) {
    if (shouldSilence(args)) return;
    originalConsoleError.apply(console, args);
};

console.log = function (...args) {
    if (shouldSilence(args)) return;
    originalConsoleLog.apply(console, args);
};

console.warn = function (...args) {
    if (shouldSilence(args)) return;
    originalConsoleWarn.apply(console, args);
};

console.info = function (...args) {
    if (shouldSilence(args)) return;
    originalConsoleInfo.apply(console, args);
};

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

// Setup Store
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ level: 'silent', factory: 'WA.Store' }) });

const welcomedPath = path.join(__dirname, 'data/welcomed.json');
if (!global.welcomedUsers) {
    try {
        if (fs.existsSync(welcomedPath)) {
            global.welcomedUsers = new Set(JSON.parse(fs.readFileSync(welcomedPath)));
        } else {
            global.welcomedUsers = new Set();
        }
    } catch (e) { global.welcomedUsers = new Set(); }
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
const msgRetryCounterCache = new NodeCache();

// Setup Express for Keep-Alive
app.get('/', (req, res) => res.send('Bot is running successfully! 🚀'));
app.listen(port, () => {
    console.log(`Port ${port} is open`);

    // Keep-Alive Self-Ping (to prevent sleeping on Koyeb Eco)
    const publicDomain = process.env.KOYEB_PUBLIC_DOMAIN || 'national-constrictor-amirni-762a9333.koyeb.app';
    if (publicDomain) {
        // Prevent sleeping by pinging self every 3 minutes
        setInterval(async () => {
            try {
                const axios = require('axios');
                const url = publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`;
                await axios.get(url);
                console.log('📡 Keep-Alive ping sent to self (Stay Awake)');
            } catch (e) {
                // Ignore errors, just trying to keep connection open
            }
        }, 3 * 60 * 1000); // Every 3 minutes
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

    // Determine if we need pairing (if no creds exist)
    const credsExist = fs.existsSync(path.join(sessionPath, 'creds.json'));
    const needsPairing = !credsExist && (!!phoneNumber || !!settings.pairingNumber);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode, // Only if pairing is strictly disabled
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
        defaultQueryTimeoutMs: 90000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        generateHighQualityLinkPreview: true,
        bgMessage: true
    });

    // Attach session path for identification
    sock.sessionPath = sessionPath;

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

    // Pairing Code Flow
    if (needsPairing && !sock.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api');

        // Use passed phoneNumber or global/settings fallback
        let pNum = phoneNumber || global.phoneNumber || settings.pairingNumber;

        if (!pNum) {
            // Does not block other bots, but might hang this one if no number provided
            // In multi-session start, we usually provide number only for NEW sessions.
            console.log(chalk.red(`❌ No phone number provided for session ${sessionPath}`));
            return;
        }

        // Clean number
        pNum = pNum.replace(/[^0-9]/g, '');

        if (pNum) {
            await delay(3000);
            try {
                let code = await sock.requestPairingCode(pNum);
                code = code?.match(/.{1,4}/g)?.join("-") || code;

                console.log(chalk.black(chalk.bgGreen(`🚀 Requesting Pairing Code for: ${pNum}...`)));
                // Modified to show cleaner output
                console.log(chalk.bold.green(`\n🔑 YOUR PAIRING CODE: `), chalk.bold.white.bgRed(` ${code} `));
                console.log(chalk.green(`\nPlease enter this code in your WhatsApp app.`));
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

            // Re-assign global.sock if it was closed or missing to ensure at least one active
            if (!global.sock || global.sock.isClosed) global.sock = sock;

            // Start Background Services (Schedulers)
            setTimeout(() => {
                if (!sock.user) return;
                try { require('./commands/ad3iya').startScheduler(sock); } catch (e) { }
                try { require('./commands/salat').startPrayerScheduler(sock); } catch (e) { }
                try { require('./lib/groupScheduler').startScheduler(sock); } catch (e) { }
                try {
                    setInterval(() => {
                        const { checkAndSendReminder } = require('./commands/autoreminder');
                        checkAndSendReminder(sock);
                    }, 60000);
                } catch (e) { }
            }, 5000);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error?.output?.statusCode) || (lastDisconnect?.error?.code);
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red(`❌ [${sessionPath}] Connection closed. Reconnecting: ${shouldReconnect}`));

            // Remove from clients array
            global.clients = global.clients.filter(c => c.sessionPath !== sessionPath);
            if (global.sock === sock) global.sock = global.clients[0] || null;

            if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
                if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(chalk.red(`⚠️ Session ${sessionPath} logged out. Deleted credentials.`));
            } else if (shouldReconnect) {
                setTimeout(() => startBot(sessionPath), 5000);
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
            if (msg.messageTimestamp < currentTime - 5) return;

            // 🛡️ PREVENT DUPLICATES
            const msgId = msg.key.id;
            if (global.processedMessages.has(msgId)) return;
            global.processedMessages.set(msgId, true);

            // Serialize message
            msg = smsg(sock, msg, store);

            // 1. Auto Status View
            if (msg.key.remoteJid === 'status@broadcast') {
                try {
                    const { handleStatusUpdate } = require('./commands/autostatus');
                    await handleStatusUpdate(sock, msg);
                } catch (e) { }
                return;
            }

            // 2. AntiDelete Store
            try {
                const { storeMessage } = require('./commands/antidelete');
                await storeMessage(sock, msg);
            } catch (e) { }

            // 3. AutoWelcome
            if (msg.key.remoteJid && !msg.key.remoteJid.endsWith('@g.us') && !msg.key.fromMe) {
                const { isOwner } = require('./lib/ownerCheck');
                const isUserOwner = isOwner(msg);

                const { getBotMode } = require('./commands/mode');
                const currentMode = getBotMode();

                // Don't welcome in Private if in Group-Only or Self mode (unless owner)
                if ((currentMode === 'groups' || currentMode === 'self') && !isUserOwner) {
                    // pass
                } else {
                    const { readState: readPmState } = require('./commands/pmblocker');
                    const pmState = readPmState();
                    const { loadAutoWelcomeState } = require('./commands/autowelcome');

                    if (loadAutoWelcomeState() && !pmState.enabled) {
                        if (!global.welcomedUsers) global.welcomedUsers = new Set();
                        if (!global.welcomedUsers.has(msg.key.remoteJid)) {
                            // Send Welcome
                            const welcomeText = `مرحباً بك يا @${msg.key.remoteJid.split('@')[0]} في عالم ${settings.botName} ⚔️\n\nللإطلاع على الأوامر: ${settings.prefix}menu`;
                            await sock.sendMessage(msg.key.remoteJid, { text: welcomeText, mentions: [msg.key.remoteJid] });
                            global.welcomedUsers.add(msg.key.remoteJid);

                            // Auto-subscribe
                            try { require('./commands/ad3iya').autoSubscribe(msg.key.remoteJid); } catch (e) { }
                            try { require('./commands/salat').autoSubscribe(msg.key.remoteJid); } catch (e) { }
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
                    const { handleMessageRevocation } = require('./commands/antidelete');
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
                const { handlePromotionEvent } = require('./commands/promote');
                if (handlePromotionEvent) await handlePromotionEvent(sock, id, participants, author);
            } else if (action === 'demote') {
                const { handleDemotionEvent } = require('./commands/demote');
                if (handleDemotionEvent) await handleDemotionEvent(sock, id, participants, author);
            }
        } catch (e) { console.error('Group Event Error:', e); }
    });

    // Anticall implementation
    sock.ev.on('call', async (call) => {
        const { readState } = require('./commands/anticall');
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
    // 0. Ensure persistent session sync if env var exists (for main session)
    await syncSession();

    const availableSessions = await getSessionPaths();
    const extraNumbers = settings.extraNumbers || [];
    const missingSessions = extraNumbers.filter(num => {
        const clean = num.replace(/[^0-9]/g, '');
        return !availableSessions.find(s => s.name === clean) && clean !== settings.pairingNumber; // Avoid double counting if using default
    });

    console.log(chalk.cyan(`\nFound ${availableSessions.length} existing sessions.`));
    if (missingSessions.length > 0) {
        console.log(chalk.yellow(`Found ${missingSessions.length} configured numbers without sessions: ${missingSessions.join(', ')}`));
    }

    // Prompt Menu
    let promptText = '\n [1] Start All Sessions';
    if (missingSessions.length > 0) {
        promptText += ` (includes ${missingSessions.length} extra numbers)`;
    }
    promptText += ' \n [2] Add New Number \n\n Choose option (1/2): ';
    const choice = await question(chalk.bgBlue(promptText));

    if (choice.trim() === '2') {
        const pNum = await question(chalk.green('\n Enter the new WhatsApp number (e.g. 2126...): '));
        const cleanNum = pNum.replace(/[^0-9]/g, '');
        if (!cleanNum) {
            console.log('Invalid number.');
            process.exit(1);
        }

        // Create new session directory
        const newSessionDir = path.join(sessionsRoot, cleanNum);
        if (!fs.existsSync(newSessionDir)) fs.mkdirSync(newSessionDir, { recursive: true });

        // Start this specific new bot with pairing
        await startBot(newSessionDir, cleanNum);

    } else {
        // Start all found sessions
        if (availableSessions.length === 0 && missingSessions.length === 0) {
            console.log(chalk.yellow('No sessions found. Starting default with settings number...'));
            await startBot(sessionDir, settings.pairingNumber);
        } else {
            console.log(chalk.green(`Starting ${availableSessions.length} existing sessions...`));
            for (const s of availableSessions) {
                await startBot(s.path);
                await delay(5000); // Stagger starts
            }

            // Start missing extra numbers (Pairing flow)
            if (missingSessions.length > 0) {
                console.log(chalk.cyan(`\nStarting pairing for ${missingSessions.length} new numbers from settings...`));
                for (const num of missingSessions) {
                    const cleanNum = num.replace(/[^0-9]/g, '');
                    const newSessionDir = path.join(sessionsRoot, cleanNum);
                    if (!fs.existsSync(newSessionDir)) fs.mkdirSync(newSessionDir, { recursive: true });

                    await startBot(newSessionDir, cleanNum);
                    await delay(10000); // Give time for pairing code to appear and user to enter it before next
                }
            }
        }
    }
})();
