const fs = require('fs');
const path = require('path');

// Configure source and target paths
const SILANA_DIR = 'C:\\Users\\hamza\\Desktop\\silana-lite-ofc-master';
const BOT_DIR = 'c:\\Users\\hamza\\Desktop\\bot-hamza-amirni-main';

const sourceLibDir = path.join(SILANA_DIR, 'lib');
const sourcePluginsDir = path.join(SILANA_DIR, 'plugins');

const targetLibDir = path.join(BOT_DIR, 'lib', 'silana');
const targetPluginsDir = path.join(BOT_DIR, 'plugins');

// Create directories if they don't exist
if (!fs.existsSync(targetLibDir)) {
    fs.mkdirSync(targetLibDir, { recursive: true });
}
if (!fs.existsSync(targetPluginsDir)) {
    fs.mkdirSync(targetPluginsDir, { recursive: true });
}

/**
 * Robust ES Module to CommonJS syntax converter
 * @param {string} code - The ESM javascript code
 * @param {boolean} isPlugin - Whether we are converting a plugin file
 */
function convertESMToCJS(code, isPlugin) {
    let result = code;

    // 1. Redirect relative library imports inside plugins to the silana subfolder
    if (isPlugin) {
        // '../lib/xxx' -> '../lib/silana/xxx'
        result = result.replace(/['"]\.\.\/lib\/([^'"]+)['"]/g, "'../lib/silana/$1'");
    }

    // 2. Replace Baileys fork import with official WhiskeySockets fork
    result = result.replace(/['"]@adiwajshing\/baileys['"]/g, "'@whiskeysockets/baileys'");

    // 3. Convert ESM imports to CommonJS requires
    
    // Combined import: import defaultExport, { named1, named2 } from 'module'
    result = result.replace(/import\s+(\w+),\s*\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, (match, defaultExport, namedExports, modulePath) => {
        return `const ${defaultExport} = require('${modulePath}');\nconst { ${namedExports} } = require('${modulePath}');`;
    });

    // Destructured import: import { name1, name2 } from 'module'
    result = result.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, 'const { $1 } = require("$2")');

    // Star import: import * as name from 'module'
    result = result.replace(/import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")');

    // Default import: import name from 'module'
    result = result.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")');

    // Bare import: import 'module'
    result = result.replace(/import\s+['"]([^'"]+)['"]/g, 'require("$1")');

    // 4. Convert ESM exports to CommonJS
    
    // Default export: export default x
    result = result.replace(/export\s+default\s+(\w+)/g, 'module.exports = $1');

    // Default export inline: export default function/async function/class/object
    result = result.replace(/export\s+default\s+/g, 'module.exports = ');

    // Named exports: export const x = y
    result = result.replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =');
    result = result.replace(/export\s+let\s+(\w+)\s*=/g, 'exports.$1 =');
    result = result.replace(/export\s+var\s+(\w+)\s*=/g, 'exports.$1 =');

    // Named function export: export function/async function x(...)
    result = result.replace(/export\s+async\s+function\s+(\w+)/g, 'exports.$1 = async function $1');
    result = result.replace(/export\s+function\s+(\w+)/g, 'exports.$1 = function $1');

    // Named class export: export class x
    result = result.replace(/export\s+class\s+(\w+)/g, 'exports.$1 = class $1');

    // Star dynamic imports inside ESM that might be written as:
    // (await import('...')) -> require('...')
    // Note: Node.js dynamic import() actually works in CJS, but let's make sure baileys references are replaced
    result = result.replace(/\(await\s+import\(['"]@adiwajshing\/baileys['"]\)\)/g, "require('@whiskeysockets/baileys')");
    result = result.replace(/await\s+import\(['"]@adiwajshing\/baileys['"]\)/g, "require('@whiskeysockets/baileys')");

    return result;
}

// Recursively get all files
function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

// Convert libraries
console.log('🔄 Converting and copying silana libraries...');
if (fs.existsSync(sourceLibDir)) {
    const libFiles = getFilesRecursively(sourceLibDir);
    let successCount = 0;
    libFiles.forEach(file => {
        if (file.endsWith('.js')) {
            const relPath = path.relative(sourceLibDir, file);
            const targetPath = path.join(targetLibDir, relPath);
            const targetSubDir = path.dirname(targetPath);

            if (!fs.existsSync(targetSubDir)) {
                fs.mkdirSync(targetSubDir, { recursive: true });
            }

            try {
                const code = fs.readFileSync(file, 'utf8');
                const convertedCode = convertESMToCJS(code, false);
                fs.writeFileSync(targetPath, convertedCode, 'utf8');
                successCount++;
            } catch (err) {
                console.error(`❌ Error converting library ${relPath}:`, err.message);
            }
        }
    });
    console.log(`✅ Converted ${successCount}/${libFiles.length} library files!`);
} else {
    console.log('⚠️ Silana library directory not found!');
}

// Convert plugins
console.log('🔄 Converting and copying silana plugins...');
if (fs.existsSync(sourcePluginsDir)) {
    const pluginFiles = getFilesRecursively(sourcePluginsDir);
    let successCount = 0;
    pluginFiles.forEach(file => {
        if (file.endsWith('.js') || !path.extname(file)) { // Some might not have .js
            const relPath = path.relative(sourcePluginsDir, file);
            const targetPath = path.join(targetPluginsDir, relPath.endsWith('.js') ? relPath : relPath + '.js');
            const targetSubDir = path.dirname(targetPath);

            if (!fs.existsSync(targetSubDir)) {
                fs.mkdirSync(targetSubDir, { recursive: true });
            }

            try {
                const code = fs.readFileSync(file, 'utf8');
                const convertedCode = convertESMToCJS(code, true);
                fs.writeFileSync(targetPath, convertedCode, 'utf8');
                successCount++;
            } catch (err) {
                console.error(`❌ Error converting plugin ${relPath}:`, err.message);
            }
        }
    });
    console.log(`✅ Converted ${successCount}/${pluginFiles.length} plugin files!`);
} else {
    console.log('⚠️ Silana plugins directory not found!');
}

console.log('🎉 Done converting all silana assets!');
