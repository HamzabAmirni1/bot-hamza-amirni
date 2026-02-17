/**
 * Levelling System Math Logic
 * High-performance XP calculation for the 'Imperial' ranking system.
 */
const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * .75;

/**
 * Get XP range for a specific level
 * @param {number} level 
 * @param {number} multiplier 
 */
function xpRange(level, multiplier = 1) {
    if (level < 0) throw new TypeError('level cannot be negative value');
    level = Math.floor(level);
    let min = level === 0 ? 0 : Math.round(Math.pow(level, growth) * multiplier) + 1;
    let max = Math.round(Math.pow(++level, growth) * multiplier);
    return {
        min,
        max,
        xp: max - min
    };
}

/**
 * Find level based on total XP
 * @param {number} xp 
 * @param {number} multiplier 
 */
function findLevel(xp, multiplier = 1) {
    if (xp === Infinity) return Infinity;
    if (isNaN(xp)) return NaN;
    if (xp <= 0) return -1;
    let level = 0;
    do {
        level++;
    } while (xpRange(level, multiplier).min <= xp);
    return --level;
}

/**
 * Check if user can level up
 * @param {number} level 
 * @param {number} xp 
 * @param {number} multiplier 
 */
function canLevelUp(level, xp, multiplier = 1) {
    if (level < 0) return false;
    if (xp === Infinity) return true;
    if (isNaN(xp)) return false;
    if (xp <= 0) return false;
    return level < findLevel(xp, multiplier);
}

module.exports = {
    growth,
    xpRange,
    findLevel,
    canLevelUp
};
