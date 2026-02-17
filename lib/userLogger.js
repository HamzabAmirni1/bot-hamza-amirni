const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Ensure the users file exists
console.log('[UserLogger] Target file:', USERS_FILE);
if (!fs.existsSync(USERS_FILE)) {
    console.log('[UserLogger] Creating users.json...');
    if (!fs.existsSync(path.dirname(USERS_FILE))) {
        fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    console.log('[UserLogger] users.json created.');
} else {
    console.log('[UserLogger] users.json already exists.');
}

function checkAndCreateFile() {
    if (!fs.existsSync(path.dirname(USERS_FILE))) {
        fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
}

function getAllUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) checkAndCreateFile();
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error reading users file:', error.message);
        // If error is ENOENT or JSON parse error, recreate/return empty
        checkAndCreateFile();
        return [];
    }
}

function addUser(userData) {
    try {
        const id = userData.id.toString();
        const cleanId = id.split(':')[0].split('@')[0] + '@' + (id.split('@')[1] || 's.whatsapp.net');

        if (cleanId.includes('@g.us')) return;

        const users = getAllUsers();
        const index = users.findIndex(u => u.id === cleanId);

        let changed = false;
        if (index === -1) {
            users.push({
                id: cleanId,
                name: userData.name || '',
                lastSeen: new Date().toISOString()
            });
            changed = true;
        } else {
            // Only update lastSeen if it's been more than 1 minute (to reduce IO)
            const lastSeen = new Date(users[index].lastSeen).getTime();
            const now = Date.now();
            if (now - lastSeen > 60000 || (userData.name && users[index].name !== userData.name)) {
                users[index].lastSeen = new Date().toISOString();
                if (userData.name) users[index].name = userData.name;
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
    } catch (error) {
        console.error('Error adding user:', error.message);
    }
}

function getUser(userId) {
    try {
        const cleanId = userId.split(':')[0].split('@')[0] + '@' + (userId.split('@')[1] || 's.whatsapp.net');
        const users = getAllUsers();
        return users.find(u => u.id === cleanId);
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

function setUserLanguage(userId, lang) {
    try {
        const cleanId = userId.split(':')[0].split('@')[0] + '@' + (userId.split('@')[1] || 's.whatsapp.net');
        const users = getAllUsers();
        const index = users.findIndex(u => u.id === cleanId);

        if (index !== -1) {
            users[index].language = lang;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            return true;
        } else {
            // Create user if not exists
            addUser({ id: userId, name: 'Unknown' });
            return setUserLanguage(userId, lang); // Retry
        }
    } catch (error) {
        console.error('Error setting user language:', error);
        return false;
    }
}

module.exports = {
    getAllUsers,
    addUser,
    getUser,
    setUserLanguage
};
