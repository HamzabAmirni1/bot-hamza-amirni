const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/users.json');

// Ensure database directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Load data
let users = {};
if (fs.existsSync(dbPath)) {
    try {
        users = JSON.parse(fs.readFileSync(dbPath));
    } catch (e) {
        console.error("Error reading users database:", e);
        users = {};
    }
}

const save = () => {
    fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
};

const getUser = (userId) => {
    if (!users[userId]) {
        users[userId] = {
            xp: 0,
            level: 0,
            coins: 100, // Starter coins
            lastDaily: 0,
            inventory: [],
            badges: [],
            rankTitle: 'مبتدئ (Novice)',
            seasonXp: 0
        };
        save();
    }
    return users[userId];
};

const addXp = (userId, amount) => {
    const user = getUser(userId);
    user.xp += amount;
    user.seasonXp += amount;

    // Level calc: 100 * level^2 or simple linear 1000 per level
    // Simple heuristic: Level = sqrt(XP / 50)
    const nextLevel = Math.floor(Math.sqrt(user.xp / 50));
    let leveledUp = false;

    if (nextLevel > user.level) {
        user.level = nextLevel;
        user.coins += nextLevel * 50; // Level up reward
        leveledUp = true;
    }

    save();
    return { user, leveledUp, level: user.level };
};

const addCoins = (userId, amount) => {
    const user = getUser(userId);
    user.coins += amount;
    save();
    return user.coins;
};

const removeCoins = (userId, amount) => {
    const user = getUser(userId);
    if (user.coins < amount) return false;
    user.coins -= amount;
    save();
    return true;
};

const claimDaily = (userId) => {
    const user = getUser(userId);
    const now = Date.now();
    const cooldown = 86400000; // 24 hours

    if (now - user.lastDaily < cooldown) {
        return { success: false, timeLeft: cooldown - (now - user.lastDaily) };
    }

    const reward = 200 + (user.level * 10); // Base 200 + bonus
    user.coins += reward;
    user.lastDaily = now;
    save();

    return { success: true, reward };
};

const getLeaderboard = (limit = 10) => {
    return Object.entries(users)
        .sort(([, a], [, b]) => b.xp - a.xp)
        .slice(0, limit)
        .map(([id, data]) => ({ id, ...data }));
};

const buyItem = (userId, itemId, cost, type = 'item') => {
    if (!removeCoins(userId, cost)) return false;
    const user = getUser(userId);

    if (type === 'title') {
        user.rankTitle = itemId;
    } else if (type === 'badge') {
        if (!user.badges.includes(itemId)) user.badges.push(itemId);
    } else {
        user.inventory.push(itemId);
    }
    save();
    return true;
};

module.exports = {
    getUser,
    addXp,
    addCoins,
    removeCoins,
    claimDaily,
    getLeaderboard,
    buyItem
};
