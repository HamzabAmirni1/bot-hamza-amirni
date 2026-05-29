const fs = require('fs');
const path = require('path');

// Configure source and target paths
const SILANA_DIR = 'C:\\Users\\hamza\\Desktop\\silana-lite-ofc-master';
const BOT_DIR = 'c:\\Users\\hamza\\Desktop\\bot-hamza-amirni-main';

const sourceLibDir = path.join(SILANA_DIR, 'lib');
const sourcePluginsDir = path.join(SILANA_DIR, 'plugins');

const targetLibDir = path.join(BOT_DIR, 'lib', 'silana');
const targetPluginsDir = path.join(BOT_DIR, 'commands', 'silana');

// Plugins to SKIP entirely - they rely on silana's global DB or clash with native bot commands
const BLACKLISTED_PLUGINS = new Set([
    'menu',           // clashes with main bot menu, uses global.db.data
    'enable',         // silana-specific group settings DB
    'register',       // silana user registration system
    'cleandblist',    // silana DB cleanup
    'clearsessionusers', // silana sessions
    'deleteplugin',   // silana plugin management
    'getplugin',      // silana plugin management  
    'plugintracker',  // silana plugin tracker
    'listplugins',    // silana plugin list
    'jadibot',        // silana-specific feature
    'autogcclose',    // silana group management
    'auto-block-kickgc', // silana group management
    'getsession',     // silana session tool
    'path',           // generic name, would break things
    'tag',            // basic tag, clashes
    'feature',        // silana feature toggles
    'script',         // silana script info
    'pin',            // too generic
    'restart',        // silana restart
    'owner',          // silana owner (we have our own)
    'disk',           // silana disk info
    'gcbot',          // silana-only
    'get',            // too generic
    'runtime',        // silana runtime
    'sfp',            // silana-only
    'list',           // too generic, clashes
    'join',           // silana join
    'kick',           // clashes with native kick
    'warn',           // clashes with native warn
    'top_gc_user',    // silana DB
    'listonline',     // silana DB
    'couple',         // silana DB
    'ppcouple',       // silana DB
]);

// Create directories if they don't exist
if (!fs.existsSync(targetLibDir)) fs.mkdirSync(targetLibDir, { recursive: true });
if (!fs.existsSync(targetPluginsDir)) fs.mkdirSync(targetPluginsDir, { recursive: true });

/**
 * Robust ES Module to CommonJS syntax converter
 */
function convertESMToCJS(code, isPlugin) {
    let result = code;

    // Pre-process: put semicolon-separated imports/requires on their own lines so that the ^import/const regexes can match them
    result = result.replace(/;\s*import\s+/g, ';\nimport ');

    // 0. Redirect relative library imports inside plugins (nested 3 levels deep under commands/silana/<category>/)
    if (isPlugin) {
        result = result.replace(/['"]\.\.\/lib\/([^'"]+)['"]/g, "'../../../lib/silana/$1'");
    }

    // 1. Replace Baileys fork with official fork
    result = result.replace(/['"]@adiwajshing\/baileys['"]/g, "'@whiskeysockets/baileys'");

    // 2. Fix import.meta.url -> use __filename directly (require('url') etc. already imported)
    result = result.replace(/fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g, '__filename');
    result = result.replace(/import\.meta\.url/g, '__filename');
    result = result.replace(/import\.meta\.dirname/g, '__dirname');

    // 3. Convert (await import('module')).default -> require('module')
    result = result.replace(/\(await\s+import\s*\(\s*(['"][^'"]+['"])\s*\)\s*\)\.default/g, 'require($1)');
    // (await import('module')) -> require('module')
    result = result.replace(/\(await\s+import\s*\(\s*(['"][^'"]+['"])\s*\)\s*\)/g, 'require($1)');
    // await import('module') -> require('module')
    result = result.replace(/await\s+import\s*\(\s*(['"][^'"]+['"])\s*\)/g, 'require($1)');

    // 4. Fix TOP-LEVEL await in variable declarations: const x = await something() -> 
    //    Wrap the await call in a sync-friendly pattern or remove await if it's a method call  
    //    Pattern: const x = await SomeClass.method({...}) at module level
    result = result.replace(
        /^\s*(const|let|var)\s+(\w+)\s*=\s*await\s+([\w.]+\s*\([^;]*\))\s*;?\s*$/gm,
        (match, decl, varName, call) => {
            // Check if this is a top-level (not inside function/class)
            // We check for common patterns that appear top-level in silana plugins
            if (/^(axios\.create|require)/.test(call.trim())) {
                // axios.create(), require() etc. - don't need await
                return `${decl} ${varName} = ${call};`;
            }
            return match; // leave it if unsure
        }
    );

    // 5. Convert ESM imports to CommonJS requires

    // Side-effect import: import 'module'
    result = result.replace(/^\s*import\s+['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm, "require('$1');");

    // Combined: import Default, { named } from 'module'
    result = result.replace(
        /^\s*import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm,
        (_, def, named, mod) => {
            const cleanedNamed = named.trim().replace(/\b(\w+)\s+as\s+(\w+)\b/g, '$1: $2');
            return `const ${def} = require('${mod}');\nconst { ${cleanedNamed} } = require('${mod}');`;
        }
    );

    // Destructured: import { name1, name2 } from 'module'
    result = result.replace(
        /^\s*import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm,
        (_, names, mod) => {
            const cleanedNames = names.trim().replace(/\b(\w+)\s+as\s+(\w+)\b/g, '$1: $2');
            return `const { ${cleanedNames} } = require('${mod}');`;
        }
    );

    // Star: import * as name from 'module'
    result = result.replace(
        /^\s*import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm,
        (_, alias, mod) => `const ${alias} = require('${mod}');`
    );

    // Default: import name from 'module'
    result = result.replace(
        /^\s*import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*(?:\/\/[^\n]*)?$/gm,
        (_, name, mod) => `const ${name} = require('${mod}');`
    );

    // 6. Convert ESM named export list at end of file: export { a, b, c }
    result = result.replace(
        /^\s*export\s+\{\s*([^}]+)\s*\}\s*;?[ \t]*$/gm,
        (_, names) => {
            const cleaned = names.trim();
            return `module.exports = { ${cleaned} };`;
        }
    );

    // 7. Named exports: export const/let/var/function/class
    result = result.replace(/^\s*export\s+const\s+/gm, 'exports.');
    // Fix: exports.name = ... (not exports.const)
    result = result.replace(/^\s*exports\.\s*(\w+)\s*=/gm, 'exports.$1 =');

    result = result.replace(/^\s*export\s+let\s+(\w+)/gm, 'exports.$1');
    result = result.replace(/^\s*export\s+var\s+(\w+)/gm, 'exports.$1');
    result = result.replace(/^\s*export\s+async\s+function\s+(\w+)/gm, 'exports.$1 = async function $1');
    result = result.replace(/^\s*export\s+function\s+(\w+)/gm, 'exports.$1 = function $1');
    result = result.replace(/^\s*export\s+class\s+(\w+)/gm, 'exports.$1 = class $1');

    // 8. Default export: export default handler / export default { ... }
    result = result.replace(/^\s*export\s+default\s+/gm, 'module.exports = ');

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
console.log('🔄 Converting silana libraries...');
if (fs.existsSync(sourceLibDir)) {
    const libFiles = getFilesRecursively(sourceLibDir);
    let ok = 0, fail = 0;
    libFiles.forEach(file => {
        if (file.endsWith('.js')) {
            const relPath = path.relative(sourceLibDir, file);
            const targetPath = path.join(targetLibDir, relPath);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            try {
                const code = fs.readFileSync(file, 'utf8');
                const converted = convertESMToCJS(code, false);
                fs.writeFileSync(targetPath, converted, 'utf8');
                ok++;
            } catch (err) {
                console.error(`❌ lib/${relPath}:`, err.message);
                fail++;
            }
        }
    });
    console.log(`✅ Libraries: ${ok} converted, ${fail} failed`);
}

// Convert plugins
console.log('🔄 Converting silana plugins...');
if (fs.existsSync(sourcePluginsDir)) {
    const pluginFiles = getFilesRecursively(sourcePluginsDir);
    let ok = 0, skipped = 0, fail = 0;
    pluginFiles.forEach(file => {
        const baseName = path.basename(file, '.js');
        // Skip blacklisted plugins
        if (BLACKLISTED_PLUGINS.has(baseName)) {
            // Delete from all possible target categories if exists
            const categories = ['downloader', 'ai', 'editor', 'morocco', 'search', 'tools', 'sticker', 'owner', 'uploader', 'islamic', 'info', 'others'];
            categories.forEach(cat => {
                const targetPath = path.join(targetPluginsDir, cat, baseName + '.js');
                if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
            });
            skipped++;
            return;
        }
        if (file.endsWith('.js') || !path.extname(file)) {
            const relPath = path.relative(sourcePluginsDir, file);
            try {
                const code = fs.readFileSync(file, 'utf8');
                
                // Detect category based on handler.tags
                let category = 'others';
                const tagsMatch = code.match(/handler\.tags\s*=\s*\[\s*['"]([^'"]+)['"]/i);
                if (tagsMatch) {
                    const tag = tagsMatch[1].toLowerCase().trim();
                    if (['downloader', 'ai', 'editor', 'morocco', 'search', 'tools', 'sticker', 'owner', 'uploader', 'islamic'].includes(tag)) {
                        category = tag;
                    } else if (tag === 'infobot') {
                        category = 'info';
                    }
                }
                
                const targetPath = path.join(targetPluginsDir, category, relPath.endsWith('.js') ? relPath : relPath + '.js');
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                
                const converted = convertESMToCJS(code, true);
                fs.writeFileSync(targetPath, converted, 'utf8');
                ok++;
            } catch (err) {
                console.error(`❌ plugin/${relPath}:`, err.message);
                fail++;
            }
        }
    });
    console.log(`✅ Plugins: ${ok} converted, ${skipped} blacklisted/skipped, ${fail} failed`);
}

console.log('🎉 Done!');
