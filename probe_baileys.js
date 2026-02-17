const Baileys = require('@whiskeysockets/baileys');
console.log('--- Baileys Exports ---');
console.log(Object.keys(Baileys));
if (Baileys.default) {
    console.log('--- Baileys.default Exports ---');
    console.log(Object.keys(Baileys.default));
}

try {
    const Store = require('@whiskeysockets/baileys/lib/Store');
    console.log('--- Baileys/lib/Store Exports ---');
    console.log(Object.keys(Store));
} catch (e) {
    console.log('Could not require lib/Store:', e.message);
}

try {
    const makeInMemoryStore = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store');
    console.log('--- Baileys/lib/Store/make-in-memory-store ---');
    console.log(typeof makeInMemoryStore);
} catch (e) {
    console.log('Could not require lib/Store/make-in-memory-store:', e.message);
}
