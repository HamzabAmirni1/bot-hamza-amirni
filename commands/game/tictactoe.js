const TicTacToe = require('../lib/tictactoe');

// Store games globally
const games = {};

async function tictactoeCommand(sock, chatId, msg, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const text = args.join(' ');
    try {
        // Check if player is already in a game
        if (Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, {
                text: '❌ You are still in a game. Type *surrender* to quit.'
            });
            return;
        }

        // Look for existing room
        let room = Object.values(games).find(room =>
            room.state === 'WAITING' &&
            (text ? room.name === text : true)
        );

        if (room) {
            // Join existing room
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map(v => ({
                'X': '❎',
                'O': '⭕',
                '1': '1️⃣',
                '2': '2️⃣',
                '3': '3️⃣',
                '4': '4️⃣',
                '5': '5️⃣',
                '6': '6️⃣',
                '7': '7️⃣',
                '8': '8️⃣',
                '9': '9️⃣',
            }[v]));

            const str = `
🎮 *لعبة إيكس أو بدات!*

كنتسناو @${room.game.currentTurn.split('@')[0]} يلعب...

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ *الروم:* ${room.id}
▢ *القوانين:*
• خاصك دير 3 دالرموز متابعة (طولا، عرضا، ولا مايلة) باش تربح
• كتب رقم (1-9) باش تحط الرمز ديالك
• كتب *surrender* باش تنسحب
`;

            // Send message only once to the group
            await sock.sendMessage(chatId, {
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            // Create new room
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, {
                text: `⏳ *كنتسناو الخصم*\nكتب *.ttt ${text || ''}* باش تلعب ضد مول الروم!`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('Error in tictactoe command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ وقع شي خطأ فبدية اللعبة.'
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        // Find player's game
        const room = Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId) &&
            room.state === 'PLAYING'
        );

        if (!room) return;

        const isSurrender = /^(surrender|insihab|انسحاب)$/i.test(text);

        if (!isSurrender && !/^[1-9]$/.test(text)) return;

        // Allow surrender at any time, not just during player's turn
        if (senderId !== room.game.currentTurn && !isSurrender) {
            await sock.sendMessage(chatId, {
                text: '❌ ماشي نوبتك!'
            });
            return;
        }

        let ok = isSurrender ? true : room.game.turn(
            senderId === room.game.playerO,
            parseInt(text) - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, {
                text: '❌ حركة غير صالحة! هاد البلاصة عامرة.'
            });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 9;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '1️⃣',
            '2': '2️⃣',
            '3': '3️⃣',
            '4': '4️⃣',
            '5': '5️⃣',
            '6': '6️⃣',
            '7': '7️⃣',
            '8': '8️⃣',
            '9': '9️⃣',
        }[v]));

        if (isSurrender) {
            // Set the winner to the opponent of the surrendering player
            winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;

            // Send a surrender message
            await sock.sendMessage(chatId, {
                text: `🏳️ @${senderId.split('@')[0]} انسحب! @${winner.split('@')[0]} ربح اللعبة!`,
                mentions: [senderId, winner]
            });

            // Delete the game immediately after surrender
            delete games[room.id];
            return;
        }

        let gameStatus;
        if (winner) {
            gameStatus = `🎉 @${winner.split('@')[0]} ربح اللعبة!`;
        } else if (isTie) {
            gameStatus = `🤝 تعادل!`;
        } else {
            gameStatus = `🎲 نوبة: @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '❎' : '⭕'})`;
        }

        const str = `
🎮 *لعبة إيكس أو*

${gameStatus}

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ اللاعب ❎: @${room.game.playerX.split('@')[0]}
▢ اللاعب ⭕: @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• كتب رقم (1-9) باش تلعب\n• كتب *surrender* باش تنسحب' : ''}
`;

        const mentions = [
            room.game.playerX,
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, {
            text: str,
            mentions: mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, {
                text: str,
                mentions: mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('Error in tictactoe move:', error);
    }
}

module.exports = {
    execute: tictactoeCommand,
    handleMove: handleTicTacToeMove
};
