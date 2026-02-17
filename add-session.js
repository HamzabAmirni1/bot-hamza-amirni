const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode,
    delay,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startSession() {
    console.log(chalk.green.bold('🚀 Add New WhatsApp Session'));

    // 1. Get Phone Number
    const phoneNumber = await question(chalk.cyan('Enter the phone number (with country code, e.g., 2126...): '));
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (!cleanNumber) {
        console.log(chalk.red('❌ Invalid number! Exiting...'));
        process.exit(1);
    }

    const sessionName = cleanNumber;
    const sessionDir = path.join(__dirname, 'sessions', sessionName);

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // We use Pairing Code
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        bgMessage: true // Allows running in background better
    });

    if (!sock.authState.creds.registered) {
        await delay(1500);
        try {
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(chalk.black(chalk.bgGreen(`\nYour Pairing Code for ${cleanNumber}: `)), chalk.black(chalk.bgRed(` ${code?.match(/.{1,4}/g)?.join("-") || code} `)));
            console.log(chalk.green(`\nPlease enter this code in your WhatsApp app:\n1. Open WhatsApp\n2. Settings > Linked Devices\n3. Link a Device\n4. Enter code`));
        } catch (e) {
            console.error('Error requesting pairing code:', e.message);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(chalk.green(`\n✅ Session '${sessionName}' Connected Successfully!`));
            console.log(chalk.cyan('You can now start the bot using: node index.js'));
            process.exit(0);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reloading connection...');
                // In a real runner we would reconnect, but here we just want to auth once.
                // If it closed due to restart/timeout during auth, we might need to retry.
                // For simplicity, let's just exit or retry locally.
            } else {
                console.log(chalk.red('❌ Connection closed. You are logged out.'));
                try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) { }
                process.exit(1);
            }
        }
    });
}

startSession();
