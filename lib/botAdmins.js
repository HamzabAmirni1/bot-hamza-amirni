const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.join(__dirname, '../data/bot_admins.json');

// Ensure the file exists
if (!fs.existsSync(ADMINS_FILE)) {
    if (!fs.existsSync(path.dirname(ADMINS_FILE))) {
        fs.mkdirSync(path.dirname(ADMINS_FILE), { recursive: true });
    }
    fs.writeFileSync(ADMINS_FILE, JSON.stringify([], null, 2));
}

function getAdmins() {
    try {
        if (!fs.existsSync(ADMINS_FILE)) return [];
        const data = fs.readFileSync(ADMINS_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error reading admins file:', error.message);
        return [];
    }
}

function addAdmin(userId, name) {
    try {
        const cleanId = userId.split(':')[0].split('@')[0] + '@s.whatsapp.net';
        const admins = getAdmins();
        
        if (admins.find(s => s.id === cleanId)) {
            return { status: false, message: 'هذا المستخدم أدمن بالفعل!' };
        }

        admins.push({
            id: cleanId,
            name: name || 'أدمن بوت',
            addedAt: new Date().toISOString()
        });

        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
        return { status: true, message: `✅ تم إضافة ${name} كأدمن جديد!\nيمكنه الآن استخدام البوت حتى لو كان مغلقاً.` };
    } catch (error) {
        console.error('Error adding admin:', error);
        return { status: false, message: 'حدث خطأ أثناء إضافة الأدمن.' };
    }
}

function removeAdmin(userId) {
    try {
        const cleanId = userId.split(':')[0].split('@')[0] + '@s.whatsapp.net';
        let admins = getAdmins();
        
        const index = admins.findIndex(s => s.id === cleanId);
        if (index === -1) {
            return { status: false, message: 'هذا المستخدم ليس أدمن!' };
        }

        const name = admins[index].name;
        admins = admins.filter(s => s.id !== cleanId);

        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
        return { status: true, message: `✅ تم حذف ${name} من قائمة الأدمن!` };
    } catch (error) {
        console.error('Error removing admin:', error);
        return { status: false, message: 'حدث خطأ أثناء حذف الأدمن.' };
    }
}

function isBotAdmin(userId) {
    try {
        const cleanId = userId.split(':')[0].split('@')[0] + '@s.whatsapp.net';
        const admins = getAdmins();
        return admins.some(s => s.id === cleanId);
    } catch (e) {
        return false;
    }
}

module.exports = {
    getAdmins,
    addAdmin,
    removeAdmin,
    isBotAdmin
};
