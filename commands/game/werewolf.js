/**
 * Werewolf Game Command
 * A social deduction game for groups
 */

const {
    createGame,
    getGame,
    deleteGame,
    addPlayer,
    removePlayer,
    startGame,
    getAlivePlayers,
    getAliveWerewolves,
    checkWinCondition,
    processNightActions,
    processVoting,
    formatPlayerList,
    getPlayerMentions,
    ROLES,
    ROLE_EMOJIS,
    PHASES,
    getRoleDistribution
} = require('../../lib/werewolf');

const { t } = require('../../lib/language');

module.exports = {
    name: 'werewolf',
    aliases: ['ww', 'مستذئب'],
    category: 'game',
    description: 'لعبة المستذئب - لعبة استنتاج اجتماعية',
    usage: '.werewolf <create|join|leave|start|vote|kill|check|protect|poison|save|info|end>',
    cooldown: 3,
    groupOnly: true,

    async execute(sock, chatId, msg, args) {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const senderName = msg.pushName || senderId.split('@')[0];
        const subCommand = args[0]?.toLowerCase();

        // Help message
        if (!subCommand || subCommand === 'help' || subCommand === 'مساعدة') {
            const helpText = `*🐺 لعبة المستذئب - Werewolf Game*

*الأوامر الأساسية:*
• \`.ww create\` - إنشاء لعبة جديدة
• \`.ww join\` - الانضمام للعبة
• \`.ww leave\` - مغادرة اللعبة
• \`.ww start\` - بدء اللعبة (4 لاعبين على الأقل)
• \`.ww info\` - معلومات اللعبة الحالية
• \`.ww end\` - إنهاء اللعبة

*أوامر اللعب (في الرسائل الخاصة):*
• \`.ww kill <رقم>\` - المستذئب يقتل لاعب
• \`.ww check <رقم>\` - العراف يفحص لاعب
• \`.ww protect <رقم>\` - الحارس يحمي لاعب
• \`.ww save\` - الساحرة تنقذ الضحية
• \`.ww poison <رقم>\` - الساحرة تسمم لاعب

*أوامر التصويت (في المجموعة):*
• \`.ww vote <رقم>\` - التصويت لإعدام لاعب

*الأدوار:*
🐺 *المستذئب* - يقتل قروي كل ليلة
👑🐺 *الألفا* - مستذئب قوي
👨‍👩‍👧‍👦 *القروي* - يحاول إيجاد المستذئبين
🔮 *العراف* - يفحص دور لاعب كل ليلة
🛡️ *الحارس* - يحمي لاعب من الموت
🧙‍♀️ *الساحرة* - لديها جرعة إنقاذ وجرعة سم
🏹 *الصياد* - يطلق النار على لاعب عند موته
🪓 *الدباغ* - يفوز إذا مات بالتصويت`;

            return sock.sendMessage(chatId, { text: helpText });
        }

        // Create game
        if (subCommand === 'create' || subCommand === 'إنشاء') {
            const existingGame = getGame(chatId);
            if (existingGame) {
                return sock.sendMessage(chatId, {
                    text: '❌ توجد لعبة نشطة بالفعل. استخدم `.ww end` لإنهائها أولاً.'
                });
            }

            createGame(chatId);
            const text = `*🐺 تم إنشاء لعبة المستذئب!*

📝 للانضمام: \`.ww join\`
🎮 لبدء اللعبة: \`.ww start\` (4 لاعبين على الأقل)
❌ للإلغاء: \`.ww end\`

⏳ في انتظار اللاعبين...`;

            return sock.sendMessage(chatId, { text });
        }

        // Join game
        if (subCommand === 'join' || subCommand === 'انضمام') {
            const game = getGame(chatId);
            if (!game) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا توجد لعبة نشطة. استخدم `.ww create` لإنشاء لعبة.'
                });
            }

            const result = addPlayer(chatId, senderId, senderName);
            const text = result.success
                ? `✅ ${result.message}\n\n👥 اللاعبون (${game.players.length}):\n${formatPlayerList(game)}`
                : `❌ ${result.message}`;

            return sock.sendMessage(chatId, { text, mentions: getPlayerMentions(game) });
        }

        // Leave game
        if (subCommand === 'leave' || subCommand === 'مغادرة') {
            const game = getGame(chatId);
            if (!game) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا توجد لعبة نشطة.'
                });
            }

            const result = removePlayer(chatId, senderId);
            const text = result.success
                ? `✅ ${result.message}\n\n👥 اللاعبون (${game.players.length}):\n${formatPlayerList(game)}`
                : `❌ ${result.message}`;

            return sock.sendMessage(chatId, { text, mentions: getPlayerMentions(game) });
        }

        // Start game
        if (subCommand === 'start' || subCommand === 'بدء') {
            const result = startGame(chatId);

            if (!result.success) {
                return sock.sendMessage(chatId, {
                    text: `❌ ${result.message}`
                });
            }

            const game = result.game;

            // Send game start message
            const startText = `*🐺 بدأت لعبة المستذئب!*

🌙 *الليلة ${game.day}*

👥 اللاعبون (${game.players.length}):
${formatPlayerList(game)}

📨 سيتم إرسال دورك في رسالة خاصة...`;

            await sock.sendMessage(chatId, {
                text: startText,
                mentions: getPlayerMentions(game)
            });

            // Send roles to players privately
            for (const player of game.players) {
                const roleEmoji = ROLE_EMOJIS[player.role];
                let roleText = `*🐺 لعبة المستذئب*\n\n`;
                roleText += `دورك: *${player.role}* ${roleEmoji}\n\n`;

                // Role-specific instructions
                if (player.role === ROLES.WEREWOLF || player.role === ROLES.ALPHA) {
                    const werewolves = game.players.filter(p =>
                        p.role === ROLES.WEREWOLF || p.role === ROLES.ALPHA
                    );
                    roleText += `*المستذئبون:*\n`;
                    werewolves.forEach(w => {
                        roleText += `• @${w.id.split('@')[0]}\n`;
                    });
                    roleText += `\n📝 استخدم \`.ww kill <رقم>\` لقتل لاعب كل ليلة`;
                } else if (player.role === ROLES.SEER) {
                    roleText += `🔮 يمكنك فحص دور لاعب واحد كل ليلة\n`;
                    roleText += `📝 استخدم \`.ww check <رقم>\` لفحص لاعب`;
                } else if (player.role === ROLES.GUARDIAN) {
                    roleText += `🛡️ يمكنك حماية لاعب واحد كل ليلة\n`;
                    roleText += `📝 استخدم \`.ww protect <رقم>\` لحماية لاعب`;
                } else if (player.role === ROLES.WITCH) {
                    roleText += `🧙‍♀️ لديك جرعتان:\n`;
                    roleText += `• جرعة إنقاذ (مرة واحدة): \`.ww save\`\n`;
                    roleText += `• جرعة سم (مرة واحدة): \`.ww poison <رقم>\``;
                } else if (player.role === ROLES.HUNTER) {
                    roleText += `🏹 عند موتك بالتصويت، يمكنك إطلاق النار على لاعب\n`;
                    roleText += `📝 استخدم \`.ww shoot <رقم>\` عند موتك`;
                } else if (player.role === ROLES.VILLAGER) {
                    roleText += `👨‍👩‍👧‍👦 أنت قروي عادي\n`;
                    roleText += `🎯 هدفك: إيجاد المستذئبين والتصويت لإعدامهم`;
                } else if (player.role === ROLES.TANNER) {
                    roleText += `🪓 هدفك الفريد: أن تموت بالتصويت!\n`;
                    roleText += `🎯 إذا مت بالتصويت، تفوز أنت وحدك`;
                }

                try {
                    await sock.sendMessage(player.id, {
                        text: roleText,
                        mentions: game.players.map(p => p.id)
                    });
                } catch (error) {
                    console.error(`Failed to send role to ${player.id}:`, error);
                }
            }

            // Start night phase
            setTimeout(() => {
                startNightPhase(sock, chatId);
            }, 5000);

            return;
        }

        // Info command
        if (subCommand === 'info' || subCommand === 'معلومات') {
            const game = getGame(chatId);
            if (!game) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا توجد لعبة نشطة.'
                });
            }

            let infoText = `*🐺 معلومات اللعبة*\n\n`;
            infoText += `📊 الحالة: ${game.started ? 'جارية' : 'في الانتظار'}\n`;
            infoText += `🌓 المرحلة: ${game.phase}\n`;
            infoText += `📅 اليوم: ${game.day}\n`;
            infoText += `👥 اللاعبون: ${game.players.length}\n`;
            infoText += `💚 أحياء: ${getAlivePlayers(game).length}\n`;
            infoText += `💀 موتى: ${game.dead.length}\n\n`;
            infoText += `*قائمة اللاعبين:*\n${formatPlayerList(game)}`;

            return sock.sendMessage(chatId, {
                text: infoText,
                mentions: getPlayerMentions(game)
            });
        }

        // End game
        if (subCommand === 'end' || subCommand === 'إنهاء') {
            const game = getGame(chatId);
            if (!game) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا توجد لعبة نشطة.'
                });
            }

            deleteGame(chatId);
            return sock.sendMessage(chatId, {
                text: '✅ تم إنهاء اللعبة.'
            });
        }

        // Vote command (during day phase)
        if (subCommand === 'vote' || subCommand === 'تصويت') {
            const game = getGame(chatId);
            if (!game || !game.started) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا توجد لعبة نشطة.'
                });
            }

            if (game.phase !== PHASES.VOTING) {
                return sock.sendMessage(chatId, {
                    text: '❌ ليس وقت التصويت الآن.'
                });
            }

            const voter = game.players.find(p => p.id === senderId);
            if (!voter || !voter.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا يمكنك التصويت.'
                });
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber)) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى تحديد رقم اللاعب. مثال: `.ww vote 3`'
                });
            }

            const target = game.players.find(p => p.number === targetNumber);
            if (!target || !target.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ اللاعب غير موجود أو ميت.'
                });
            }

            game.votes[senderId] = targetNumber;

            return sock.sendMessage(chatId, {
                text: `✅ تم تسجيل تصويتك ضد اللاعب رقم ${targetNumber}`
            });
        }

        // Night action commands (in private chat)
        const isPrivateChat = !chatId.endsWith('@g.us');

        if (!isPrivateChat) {
            return sock.sendMessage(chatId, {
                text: '❌ أمر غير معروف. استخدم `.ww help` للمساعدة.'
            });
        }

        // Find which game this player is in
        let playerGame = null;
        let player = null;

        for (const [gChatId, game] of Object.entries(getGame)) {
            const p = game.players?.find(pl => pl.id === senderId);
            if (p) {
                playerGame = game;
                player = p;
                break;
            }
        }

        if (!playerGame || !player) {
            return sock.sendMessage(chatId, {
                text: '❌ أنت لست في أي لعبة نشطة.'
            });
        }

        // Kill command (werewolf)
        if (subCommand === 'kill' || subCommand === 'قتل') {
            if (player.role !== ROLES.WEREWOLF && player.role !== ROLES.ALPHA) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر للمستذئبين فقط.'
                });
            }

            if (playerGame.phase !== PHASES.NIGHT) {
                return sock.sendMessage(chatId, {
                    text: '❌ يمكنك القتل في الليل فقط.'
                });
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber)) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى تحديد رقم اللاعب. مثال: `.ww kill 3`'
                });
            }

            const target = playerGame.players.find(p => p.number === targetNumber);
            if (!target || !target.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ اللاعب غير موجود أو ميت.'
                });
            }

            if (target.role === ROLES.WEREWOLF || target.role === ROLES.ALPHA) {
                return sock.sendMessage(chatId, {
                    text: '❌ لا يمكنك قتل مستذئب آخر!'
                });
            }

            playerGame.nightActions.werewolfTarget = targetNumber;

            return sock.sendMessage(chatId, {
                text: `✅ تم اختيار اللاعب رقم ${targetNumber} للقتل.`
            });
        }

        // Check command (seer)
        if (subCommand === 'check' || subCommand === 'فحص') {
            if (player.role !== ROLES.SEER) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر للعراف فقط.'
                });
            }

            if (playerGame.phase !== PHASES.NIGHT) {
                return sock.sendMessage(chatId, {
                    text: '❌ يمكنك الفحص في الليل فقط.'
                });
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber)) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى تحديد رقم اللاعب. مثال: `.ww check 3`'
                });
            }

            const target = playerGame.players.find(p => p.number === targetNumber);
            if (!target || !target.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ اللاعب غير موجود أو ميت.'
                });
            }

            const isWerewolf = target.role === ROLES.WEREWOLF || target.role === ROLES.ALPHA;
            const resultText = isWerewolf
                ? `🐺 اللاعب رقم ${targetNumber} هو *مستذئب*!`
                : `👨‍👩‍👧‍👦 اللاعب رقم ${targetNumber} *ليس مستذئباً*.`;

            return sock.sendMessage(chatId, { text: resultText });
        }

        // Protect command (guardian)
        if (subCommand === 'protect' || subCommand === 'حماية') {
            if (player.role !== ROLES.GUARDIAN) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر للحارس فقط.'
                });
            }

            if (playerGame.phase !== PHASES.NIGHT) {
                return sock.sendMessage(chatId, {
                    text: '❌ يمكنك الحماية في الليل فقط.'
                });
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber)) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى تحديد رقم اللاعب. مثال: `.ww protect 3`'
                });
            }

            const target = playerGame.players.find(p => p.number === targetNumber);
            if (!target || !target.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ اللاعب غير موجود أو ميت.'
                });
            }

            playerGame.nightActions.guardianTarget = targetNumber;

            return sock.sendMessage(chatId, {
                text: `✅ تم حماية اللاعب رقم ${targetNumber}.`
            });
        }

        // Save command (witch)
        if (subCommand === 'save' || subCommand === 'إنقاذ') {
            if (player.role !== ROLES.WITCH) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر للساحرة فقط.'
                });
            }

            if (playerGame.witchUsedPotion) {
                return sock.sendMessage(chatId, {
                    text: '❌ لقد استخدمت جرعة الإنقاذ بالفعل.'
                });
            }

            if (playerGame.phase !== PHASES.NIGHT) {
                return sock.sendMessage(chatId, {
                    text: '❌ يمكنك استخدام الجرعة في الليل فقط.'
                });
            }

            playerGame.nightActions.witchSave = true;

            return sock.sendMessage(chatId, {
                text: `✅ سيتم إنقاذ ضحية المستذئبين الليلة.`
            });
        }

        // Poison command (witch)
        if (subCommand === 'poison' || subCommand === 'سم') {
            if (player.role !== ROLES.WITCH) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر للساحرة فقط.'
                });
            }

            if (playerGame.witchUsedPoison) {
                return sock.sendMessage(chatId, {
                    text: '❌ لقد استخدمت جرعة السم بالفعل.'
                });
            }

            if (playerGame.phase !== PHASES.NIGHT) {
                return sock.sendMessage(chatId, {
                    text: '❌ يمكنك استخدام الجرعة في الليل فقط.'
                });
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber)) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى تحديد رقم اللاعب. مثال: `.ww poison 3`'
                });
            }

            const target = playerGame.players.find(p => p.number === targetNumber);
            if (!target || !target.alive) {
                return sock.sendMessage(chatId, {
                    text: '❌ اللاعب غير موجود أو ميت.'
                });
            }

            playerGame.nightActions.witchPoison = targetNumber;

            return sock.sendMessage(chatId, {
                text: `✅ تم تسميم اللاعب رقم ${targetNumber}.`
            });
        }

        return sock.sendMessage(chatId, {
            text: '❌ أمر غير معروف. استخدم `.ww help` للمساعدة.'
        });
    }
};

// Helper function to start night phase
async function startNightPhase(sock, chatId) {
    const game = getGame(chatId);
    if (!game) return;

    game.phase = PHASES.NIGHT;

    const nightText = `*🌙 الليلة ${game.day}*

الليل حل... المستذئبون يستيقظون 🐺
الأدوار الليلية، قوموا بأفعالكم في الرسائل الخاصة!

⏳ لديكم 60 ثانية...`;

    await sock.sendMessage(chatId, { text: nightText });

    // Wait for night actions (60 seconds)
    setTimeout(() => {
        startDayPhase(sock, chatId);
    }, 60000);
}

// Helper function to start day phase
async function startDayPhase(sock, chatId) {
    const game = getGame(chatId);
    if (!game) return;

    game.phase = PHASES.DAY;

    // Process night actions
    const results = processNightActions(game);

    let dayText = `*☀️ اليوم ${game.day}*\n\n`;

    if (results.killed.length > 0) {
        dayText += `💀 *تم العثور على جثث:*\n`;
        results.killed.forEach(victim => {
            dayText += `• @${victim.id.split('@')[0]} (${victim.number})\n`;
        });
    } else {
        dayText += `✨ لم يمت أحد الليلة الماضية!\n`;
    }

    dayText += `\n⏳ لديكم 60 ثانية للنقاش...`;

    await sock.sendMessage(chatId, {
        text: dayText,
        mentions: results.killed.map(p => p.id)
    });

    // Check win condition
    const winResult = checkWinCondition(game);
    if (winResult) {
        return endGame(sock, chatId, winResult);
    }

    // Wait for discussion (60 seconds)
    setTimeout(() => {
        startVotingPhase(sock, chatId);
    }, 60000);
}

// Helper function to start voting phase
async function startVotingPhase(sock, chatId) {
    const game = getGame(chatId);
    if (!game) return;

    game.phase = PHASES.VOTING;

    const votingText = `*🗳️ وقت التصويت!*

👥 اللاعبون الأحياء:
${formatPlayerList(game)}

📝 صوت باستخدام: \`.ww vote <رقم>\`
⏳ لديكم 60 ثانية للتصويت...`;

    await sock.sendMessage(chatId, {
        text: votingText,
        mentions: getPlayerMentions(game)
    });

    // Wait for votes (60 seconds)
    setTimeout(() => {
        processVotingPhase(sock, chatId);
    }, 60000);
}

// Helper function to process voting results
async function processVotingPhase(sock, chatId) {
    const game = getGame(chatId);
    if (!game) return;

    const result = processVoting(game);

    let resultText = `*🗳️ نتائج التصويت*\n\n`;

    if (result.tie) {
        resultText += `⚖️ تعادل في الأصوات! لم يتم إعدام أحد.`;
    } else if (!result.executed) {
        resultText += `❌ لم يتم التصويت. لم يتم إعدام أحد.`;
    } else {
        resultText += `💀 تم إعدام: @${result.executed.id.split('@')[0]}\n`;
        resultText += `🎭 كان دوره: *${result.executed.role}* ${ROLE_EMOJIS[result.executed.role]}`;

        // Check if tanner won
        if (result.executed.role === ROLES.TANNER) {
            return endGame(sock, chatId, {
                winner: 'tanner',
                message: `🪓 فاز الدباغ! @${result.executed.id.split('@')[0]} حقق هدفه بالموت في التصويت!`,
                mentions: [result.executed.id]
            });
        }
    }

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: result.executed ? [result.executed.id] : []
    });

    // Check win condition
    const winResult = checkWinCondition(game);
    if (winResult) {
        return endGame(sock, chatId, winResult);
    }

    // Next day
    game.day++;
    setTimeout(() => {
        startNightPhase(sock, chatId);
    }, 5000);
}

// Helper function to end game
async function endGame(sock, chatId, winResult) {
    const game = getGame(chatId);
    if (!game) return;

    let endText = `*🎮 انتهت اللعبة!*\n\n`;
    endText += `${winResult.message}\n\n`;
    endText += `*📊 الأدوار:*\n`;

    game.players.forEach(player => {
        const status = player.alive ? '✅' : '💀';
        endText += `${status} @${player.id.split('@')[0]} - ${player.role} ${ROLE_EMOJIS[player.role]}\n`;
    });

    await sock.sendMessage(chatId, {
        text: endText,
        mentions: winResult.mentions || getPlayerMentions(game)
    });

    deleteGame(chatId);
}
