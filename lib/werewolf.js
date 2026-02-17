/**
 * Werewolf Game Module for WhatsApp Bot
 * A social deduction game where players try to identify werewolves among them
 */

const settings = require('../settings');

// Game storage
const games = {};

// Game roles with their abilities
const ROLES = {
    WEREWOLF: 'werewolf',
    VILLAGER: 'villager',
    SEER: 'seer',
    GUARDIAN: 'guardian',
    WITCH: 'witch',
    HUNTER: 'hunter',
    TANNER: 'tanner',
    ALPHA: 'alpha'
};

// Role emojis for display
const ROLE_EMOJIS = {
    [ROLES.WEREWOLF]: '🐺',
    [ROLES.VILLAGER]: '👨‍👩‍👧‍👦',
    [ROLES.SEER]: '🔮',
    [ROLES.GUARDIAN]: '🛡️',
    [ROLES.WITCH]: '🧙‍♀️',
    [ROLES.HUNTER]: '🏹',
    [ROLES.TANNER]: '🪓',
    [ROLES.ALPHA]: '👑🐺'
};

// Game phases
const PHASES = {
    WAITING: 'waiting',
    NIGHT: 'night',
    DAY: 'day',
    VOTING: 'voting',
    ENDED: 'ended'
};

/**
 * Create a new werewolf game
 */
function createGame(chatId) {
    games[chatId] = {
        chatId,
        phase: PHASES.WAITING,
        day: 0,
        players: [],
        votes: {},
        nightActions: {},
        dead: [],
        protected: null,
        witchUsedPotion: false,
        witchUsedPoison: false,
        started: false,
        createdAt: Date.now()
    };
    return games[chatId];
}

/**
 * Get game by chat ID
 */
function getGame(chatId) {
    return games[chatId];
}

/**
 * Delete a game
 */
function deleteGame(chatId) {
    delete games[chatId];
}

/**
 * Add player to game
 */
function addPlayer(chatId, playerId, playerName) {
    const game = games[chatId];
    if (!game) return { success: false, message: 'لا توجد لعبة نشطة' };

    if (game.started) {
        return { success: false, message: 'اللعبة بدأت بالفعل' };
    }

    if (game.players.find(p => p.id === playerId)) {
        return { success: false, message: 'أنت مسجل بالفعل' };
    }

    game.players.push({
        id: playerId,
        name: playerName,
        role: null,
        alive: true,
        number: game.players.length + 1
    });

    return { success: true, message: `تم تسجيل ${playerName}` };
}

/**
 * Remove player from game
 */
function removePlayer(chatId, playerId) {
    const game = games[chatId];
    if (!game) return { success: false, message: 'لا توجد لعبة نشطة' };

    if (game.started) {
        return { success: false, message: 'لا يمكن المغادرة بعد بدء اللعبة' };
    }

    const index = game.players.findIndex(p => p.id === playerId);
    if (index === -1) {
        return { success: false, message: 'أنت لست في اللعبة' };
    }

    const player = game.players[index];
    game.players.splice(index, 1);

    // Renumber remaining players
    game.players.forEach((p, i) => {
        p.number = i + 1;
    });

    return { success: true, message: `${player.name} غادر اللعبة` };
}

/**
 * Get role distribution based on player count
 */
function getRoleDistribution(playerCount) {
    if (playerCount < 4) return null;

    const distributions = {
        4: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 1, [ROLES.VILLAGER]: 2 },
        5: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 1, [ROLES.GUARDIAN]: 1, [ROLES.VILLAGER]: 2 },
        6: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 1, [ROLES.GUARDIAN]: 1, [ROLES.TANNER]: 1, [ROLES.VILLAGER]: 2 },
        7: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 1, [ROLES.GUARDIAN]: 1, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 0, [ROLES.VILLAGER]: 1 },
        8: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 1, [ROLES.GUARDIAN]: 1, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 0, [ROLES.VILLAGER]: 2 },
        9: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 1, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 1 },
        10: { [ROLES.WEREWOLF]: 1, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 2, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 1 },
        11: { [ROLES.WEREWOLF]: 2, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 2, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 1 },
        12: { [ROLES.WEREWOLF]: 2, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 2, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 2 },
        13: { [ROLES.WEREWOLF]: 2, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 3, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 2 },
        14: { [ROLES.WEREWOLF]: 2, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 3, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 3 },
        15: { [ROLES.WEREWOLF]: 2, [ROLES.SEER]: 2, [ROLES.GUARDIAN]: 3, [ROLES.ALPHA]: 1, [ROLES.TANNER]: 1, [ROLES.WITCH]: 1, [ROLES.HUNTER]: 1, [ROLES.VILLAGER]: 4 }
    };

    return distributions[playerCount] || distributions[15];
}

/**
 * Shuffle array
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Assign roles to players
 */
function assignRoles(chatId) {
    const game = games[chatId];
    if (!game) return false;

    const distribution = getRoleDistribution(game.players.length);
    if (!distribution) return false;

    const roles = [];
    for (const [role, count] of Object.entries(distribution)) {
        for (let i = 0; i < count; i++) {
            roles.push(role);
        }
    }

    const shuffledRoles = shuffle(roles);
    game.players.forEach((player, index) => {
        player.role = shuffledRoles[index];
    });

    return true;
}

/**
 * Start the game
 */
function startGame(chatId) {
    const game = games[chatId];
    if (!game) return { success: false, message: 'لا توجد لعبة نشطة' };

    if (game.players.length < 4) {
        return { success: false, message: 'يجب أن يكون هناك 4 لاعبين على الأقل' };
    }

    if (game.started) {
        return { success: false, message: 'اللعبة بدأت بالفعل' };
    }

    if (!assignRoles(chatId)) {
        return { success: false, message: 'فشل توزيع الأدوار' };
    }

    game.started = true;
    game.phase = PHASES.NIGHT;
    game.day = 1;

    return { success: true, game };
}

/**
 * Get alive players
 */
function getAlivePlayers(game) {
    return game.players.filter(p => p.alive);
}

/**
 * Get alive werewolves
 */
function getAliveWerewolves(game) {
    return game.players.filter(p => p.alive && (p.role === ROLES.WEREWOLF || p.role === ROLES.ALPHA));
}

/**
 * Get alive villagers (non-werewolves)
 */
function getAliveVillagers(game) {
    return game.players.filter(p => p.alive && p.role !== ROLES.WEREWOLF && p.role !== ROLES.ALPHA && p.role !== ROLES.TANNER);
}

/**
 * Check win condition
 */
function checkWinCondition(game) {
    const aliveWerewolves = getAliveWerewolves(game);
    const aliveVillagers = getAliveVillagers(game);

    if (aliveWerewolves.length === 0) {
        return { winner: 'villagers', message: 'فاز القرويون! تم القضاء على جميع المستذئبين 🎉' };
    }

    if (aliveVillagers.length === 0) {
        return { winner: 'werewolves', message: 'فاز المستذئبون! تم القضاء على جميع القرويين 🐺' };
    }

    if (aliveWerewolves.length >= aliveVillagers.length) {
        return { winner: 'werewolves', message: 'فاز المستذئبون! عددهم يساوي أو يفوق القرويين 🐺' };
    }

    return null;
}

/**
 * Process night actions
 */
function processNightActions(game) {
    const results = {
        killed: [],
        protected: null,
        seerChecked: null,
        witchSaved: false,
        witchPoisoned: null
    };

    // Werewolf kill
    if (game.nightActions.werewolfTarget) {
        const target = game.players.find(p => p.number === game.nightActions.werewolfTarget);
        if (target && target.alive) {
            results.killed.push(target);
        }
    }

    // Guardian protection
    if (game.nightActions.guardianTarget) {
        results.protected = game.nightActions.guardianTarget;
    }

    // Witch actions
    if (game.nightActions.witchSave && results.killed.length > 0) {
        results.witchSaved = true;
        results.killed = [];
        game.witchUsedPotion = true;
    }

    if (game.nightActions.witchPoison) {
        const target = game.players.find(p => p.number === game.nightActions.witchPoison);
        if (target && target.alive) {
            results.witchPoisoned = target;
            results.killed.push(target);
        }
        game.witchUsedPoison = true;
    }

    // Apply protection
    if (results.protected) {
        results.killed = results.killed.filter(p => p.number !== results.protected);
    }

    // Mark players as dead
    results.killed.forEach(player => {
        player.alive = false;
        game.dead.push(player.number);
    });

    // Clear night actions
    game.nightActions = {};

    return results;
}

/**
 * Process voting
 */
function processVoting(game) {
    const voteCounts = {};

    // Count votes
    for (const [voterId, targetNumber] of Object.entries(game.votes)) {
        const voter = game.players.find(p => p.id === voterId);
        if (!voter || !voter.alive) continue;

        voteCounts[targetNumber] = (voteCounts[targetNumber] || 0) + 1;
    }

    // Find player with most votes
    let maxVotes = 0;
    let executed = [];

    for (const [targetNumber, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            executed = [parseInt(targetNumber)];
        } else if (count === maxVotes && count > 0) {
            executed.push(parseInt(targetNumber));
        }
    }

    // Clear votes
    game.votes = {};

    // If tie or no votes, no one is executed
    if (executed.length !== 1 || maxVotes === 0) {
        return { executed: null, tie: executed.length > 1 };
    }

    const executedPlayer = game.players.find(p => p.number === executed[0]);
    if (executedPlayer) {
        executedPlayer.alive = false;
        game.dead.push(executedPlayer.number);
    }

    return { executed: executedPlayer, tie: false };
}

/**
 * Format player list
 */
function formatPlayerList(game, showRoles = false, showDead = true) {
    let text = '';
    game.players.forEach(player => {
        const status = player.alive ? '' : '☠️';
        const role = showRoles ? ` [${player.role}]` : '';
        text += `(${player.number}) @${player.id.split('@')[0]} ${status}${role}\n`;
    });
    return text;
}

/**
 * Get player mentions
 */
function getPlayerMentions(game) {
    return game.players.map(p => p.id);
}

module.exports = {
    ROLES,
    ROLE_EMOJIS,
    PHASES,
    createGame,
    getGame,
    deleteGame,
    addPlayer,
    removePlayer,
    startGame,
    getAlivePlayers,
    getAliveWerewolves,
    getAliveVillagers,
    checkWinCondition,
    processNightActions,
    processVoting,
    formatPlayerList,
    getPlayerMentions,
    getRoleDistribution
};
