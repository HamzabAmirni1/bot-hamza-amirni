const os = require("os");
const { performance } = require("perf_hooks");
const settings = require("../settings.js");
const { t } = require("../lib/language");

// Helper to format bytes to human-readable form
function formatBytes(bytes) {
    if (bytes === 0) return "0B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

async function pingCommand(sock, chatId, message, args, commands, userLang) {
    try {
        const start = performance.now();

        // Simulate "speed test" with a message
        await sock.sendMessage(chatId, { text: t('ping.pong', {}, userLang) }, { quoted: message });

        const latency = ((performance.now() - start) / 1000).toFixed(4); // seconds

        // CPU info
        const cpus = os.cpus();
        const cpu = cpus.reduce(
            (acc, c) => {
                const total = Object.values(c.times).reduce((a, b) => a + b, 0);
                acc.total += total;
                acc.speed += c.speed;
                Object.keys(c.times).forEach(key => acc.times[key] += c.times[key]);
                return acc;
            },
            { speed: 0, total: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }
        );

        // RAM usage
        const ramUsage = `${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}`;

        const response = `${t('ping.pong', {}, userLang)}
${t('ping.speed', { latency }, userLang)}

${t('ping.server_info', { botName: t('common.botName', {}, userLang) }, userLang)}
${t('ping.ram_usage', { usage: ramUsage }, userLang)}
${t('ping.cpu_cores', { cores: cpus.length }, userLang)}
${t('ping.cpu_speed', { speed: (cpu.speed / cpus.length).toFixed(2) }, userLang)}
`;

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (error) {
        console.error("Error in ping command:", error);
        await sock.sendMessage(chatId, { text: t('ping.error') }, { quoted: message });
    }
}

module.exports = pingCommand;
