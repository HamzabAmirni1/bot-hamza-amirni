const fs = require('fs');
const path = require('path');

console.log('🧹 Starting cleanup...\n');

// Directories and files to remove
const itemsToRemove = [
    // Temporary directories
    'tmp',
    'temp',
    'node_modules/.cache',

    // Session data (if you want to clean sessions)
    // 'session',
    // 'sessions',

    // Log files
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',

    // Temporary bot files
    'media/brat_output.mp4',

    // Fix scripts (if they exist)
    'fix-imports.js',
    'fix-all-imports.js',

    // Other temporary files
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini'
];

let removedCount = 0;
let totalSize = 0;

// Helper function to get directory size
function getDirectorySize(dirPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        });
    } catch (e) {
        // Ignore errors
    }
    return size;
}

// Helper function to remove directory recursively
function removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        const size = getDirectorySize(dirPath);
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${dirPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
        totalSize += size;
        removedCount++;
        return true;
    }
    return false;
}

// Helper function to remove file
function removeFile(filePath) {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        fs.unlinkSync(filePath);
        console.log(`✅ Removed file: ${filePath} (${(size / 1024).toFixed(2)} KB)`);
        totalSize += size;
        removedCount++;
        return true;
    }
    return false;
}

// Helper function to find and remove files by pattern
function removeByPattern(pattern) {
    const dir = __dirname;
    const regex = new RegExp(pattern.replace('*', '.*'));

    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (regex.test(file)) {
                const filePath = path.join(dir, file);
                removeFile(filePath);
            }
        });
    } catch (e) {
        // Ignore errors
    }
}

// Process each item
itemsToRemove.forEach(item => {
    const itemPath = path.join(__dirname, item);

    if (item.includes('*')) {
        // Pattern matching
        removeByPattern(item);
    } else if (fs.existsSync(itemPath)) {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            removeDirectory(itemPath);
        } else {
            removeFile(itemPath);
        }
    }
});

// Clean empty directories in temp and tmp
['temp', 'tmp'].forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        try {
            const files = fs.readdirSync(dirPath);
            if (files.length === 0) {
                fs.rmdirSync(dirPath);
                console.log(`✅ Removed empty directory: ${dir}`);
            }
        } catch (e) {
            // Ignore
        }
    }
});

console.log(`\n✨ Cleanup finished!`);
console.log(`📊 Removed ${removedCount} items`);
console.log(`💾 Freed up ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
