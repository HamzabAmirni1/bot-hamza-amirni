# 🐺 Werewolf Game Integration - Complete

## Overview
Successfully integrated a comprehensive Werewolf (Mafia) game into your WhatsApp bot. This is a social deduction game where players try to identify werewolves among villagers.

## Files Created

### 1. `lib/werewolf.js`
Core game logic module with:
- Game state management
- Role distribution system (8 different roles)
- Win condition checking
- Night action processing
- Voting system
- Player management

### 2. `commands/werewolf.js`
Command handler with full game flow:
- Game creation and management
- Player join/leave functionality
- Role assignment and private messaging
- Night phase (werewolf kills, seer checks, guardian protection, witch actions)
- Day phase (discussion and deaths announcement)
- Voting phase (democratic execution)
- Win condition detection
- Automatic game progression

### 3. Language Support
Added comprehensive Moroccan Darija translations to `lang/ma.json` for:
- All game phases
- Role descriptions
- Action confirmations
- Error messages
- Win/loss announcements

## Game Features

### 🎭 Roles (8 Total)
1. **🐺 Werewolf** - Kills one villager each night
2. **👑🐺 Alpha Werewolf** - Powerful werewolf with special abilities
3. **👨‍👩‍👧‍👦 Villager** - Tries to find werewolves through voting
4. **🔮 Seer** - Can check one player's role each night
5. **🛡️ Guardian** - Protects one player from death each night
6. **🧙‍♀️ Witch** - Has one healing potion and one poison potion
7. **🏹 Hunter** - Can shoot someone when voted out
8. **🪓 Tanner** - Wins if executed by vote (unique win condition)

### 🎮 Game Flow
1. **Waiting Phase** - Players join the game
2. **Night Phase** (60s) - Special roles perform actions in private
3. **Day Phase** (60s) - Deaths announced, players discuss
4. **Voting Phase** (60s) - Players vote to execute someone
5. **Repeat** until win condition met

### 📝 Commands

#### Basic Commands
- `.ww create` - Create a new game
- `.ww join` - Join the game
- `.ww leave` - Leave before game starts
- `.ww start` - Start game (min 4 players)
- `.ww info` - View game status
- `.ww end` - Cancel the game
- `.ww help` - Show help message

#### Night Actions (Private Messages)
- `.ww kill <number>` - Werewolf kills a player
- `.ww check <number>` - Seer checks a player's role
- `.ww protect <number>` - Guardian protects a player
- `.ww save` - Witch saves werewolf victim
- `.ww poison <number>` - Witch poisons a player

#### Voting (Group Chat)
- `.ww vote <number>` - Vote to execute a player

## Role Distribution by Player Count

| Players | Werewolf | Seer | Guardian | Witch | Hunter | Alpha | Tanner | Villager |
|---------|----------|------|----------|-------|--------|-------|--------|----------|
| 4       | 1        | 1    | 0        | 0     | 0      | 0     | 0      | 2        |
| 5       | 1        | 1    | 1        | 0     | 0      | 0     | 0      | 2        |
| 6       | 1        | 1    | 1        | 0     | 0      | 0     | 1      | 2        |
| 7       | 1        | 1    | 1        | 1     | 0      | 1     | 1      | 1        |
| 8       | 1        | 1    | 1        | 1     | 0      | 1     | 1      | 2        |
| 9+      | 1-2      | 2    | 2-3      | 1     | 1      | 1     | 1      | 1-4      |

## Win Conditions

### Villagers Win
- All werewolves are eliminated

### Werewolves Win
- All villagers are eliminated OR
- Werewolves equal or outnumber villagers

### Tanner Wins
- Tanner is executed by vote (solo win)

## Technical Features

✅ **CommonJS Compatible** - Works with your existing bot structure
✅ **Localized** - Full Moroccan Darija support
✅ **Automatic Timers** - 60-second phases with auto-progression
✅ **Private Messaging** - Roles sent privately to players
✅ **Mention Support** - Players mentioned in announcements
✅ **Error Handling** - Comprehensive validation and error messages
✅ **State Management** - Persistent game state during play
✅ **Group Only** - Restricted to group chats for gameplay

## Usage Example

```
User1: .ww create
Bot: 🐺 تصاوبات لعبة المستذئب!
     📝 باش تدخل: .ww join

User1: .ww join
User2: .ww join
User3: .ww join
User4: .ww join

User1: .ww start
Bot: 🐺 بدات لعبة المستذئب!
     [Sends roles privately to each player]
     
Bot: 🌙 الليلة 1
     الليل طاح... المستذئبين فايقين 🐺
     
[Players perform night actions in private]

Bot: ☀️ النهار 1
     💀 لقاو جثث:
     • @User3 (3)
     
Bot: 🗳️ وقت التصويت!
     [Players vote]
     
Bot: 💀 تنفذ: @User2
     🎭 كان دورو: werewolf 🐺
```

## Next Steps

The werewolf game is now fully integrated and ready to use! Players can:
1. Create games in group chats
2. Play with 4-15 players
3. Experience all 8 roles
4. Enjoy automatic game progression
5. Communicate in Moroccan Darija

## Notes

- Game requires minimum 4 players
- All timers are set to 60 seconds (configurable)
- Private messages sent to players for role information
- Game state automatically cleaned up after completion
- Supports multiple concurrent games in different groups

---
**Integration Complete!** 🎉
The werewolf game is now a fully functional part of your WhatsApp bot, ready to provide hours of entertainment for your users.
