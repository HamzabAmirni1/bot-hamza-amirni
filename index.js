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
process.on('unhandledRejection', (reason, promise) => {
    console.error('🛑 Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('🛑 Uncaught Exception:', err);
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

// Setup Express for Keep-Alive
app.get('/', (req, res) => res.send('Bot is running successfully! 🚀'));
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
        browser: ['Hamza', 'Chrome', '20.0.04'],
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
        defaultQueryTimeoutMs: 120000,
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        fireInitQueries: false,
        syncFullHistory: false,
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
            // Wait to ensure socket is ready before requesting code
            await delay(5000);
            try {
                // Double check if registered after delay (it might have connected)
                if (!sock.authState.creds.registered) {
                    let code = await sock.requestPairingCode(pNum);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;

                    console.log(chalk.black(chalk.bgGreen(`🚀 Requesting Pairing Code for: ${pNum}...`)));
                    console.log(chalk.bold.green(`\n🔑 YOUR PAIRING CODE: `), chalk.bold.white.bgRed(` ${code} `));
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
            } else if (global.retryCount[sessionPath] > 12 && (statusCode === 440 || statusCode === 428)) {
                console.log(chalk.red(`🛑 [${sessionPath}] Critical error loop (440/428). Clearing session to fix.`));
                if (fs.existsSync(sessionPath)) {
                    try {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                        console.log(chalk.yellow(`✅ Corrupted session cleared. Restarting to request new pairing...`));
                        setTimeout(() => startBot(sessionPath, phoneNumber), 5000);
                    } catch (e) { }
                }
            } else if (statusCode === 408 || statusCode === DisconnectReason.connectionLost) {
                const retryDelay = 30000 + Math.floor(Math.random() * 15000);
                console.log(chalk.yellow(`Connection lost (408), retrying in ${retryDelay / 1000}s...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
            } else if (statusCode === 500 || statusCode === DisconnectReason.connectionClosed || statusCode === 428) {
                const retryDelay = 25000 + Math.floor(Math.random() * 10000);
                console.log(chalk.yellow(`Connection closed (428/500), retrying in ${retryDelay / 1000}s...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
            } else if (statusCode === 440 || statusCode === DisconnectReason.restartRequired) {
                const retryDelay = 40000 + Math.floor(Math.random() * 20000);
                console.log(chalk.cyan(`Restart required (440 - Conflict), reconnecting in ${retryDelay / 1000}s to avoid loop...`));
                setTimeout(() => startBot(sessionPath, phoneNumber), retryDelay);
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
