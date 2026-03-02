# 🤖 Hamza Amirni WhatsApp Bot

A powerful multi-session WhatsApp bot built with Baileys, featuring AI capabilities, Islamic services, media downloads, and much more.

## ✨ Features

### 🔐 Multi-Session Support
- Connect multiple WhatsApp accounts simultaneously
- Easy pairing code system for new numbers
- Automatic session management and reconnection
- Cloud deployment ready with environment variables

### 🤖 AI & Smart Features
- **AI Chat**: Gemini, GPT, DeepSeek, Qwen integration
- **Image Generation**: AI-powered image creation
- **Image Enhancement**: Upscale, colorize, remove background
- **Video Generation**: Text-to-video, image-to-video

### 🕌 Islamic Services
- **Prayer Times**: Automated daily prayer notifications
- **Quran**: Read, listen, and search Quranic verses
- **Duas & Azkar**: Daily Islamic reminders
- **Tafsir**: Quranic interpretations

### 📥 Media Downloads
- **Social Media**: TikTok, Instagram, Facebook, Twitter
- **YouTube**: Video and audio downloads
- **Spotify**: Track information and downloads
- **APK**: Android app downloads

### 🎮 Games & Fun
- Trivia, Math Quiz, Hangman, TicTacToe
- Werewolf, Blackjack, Slots
- Memes, Jokes, Facts, Quotes

### 👥 Group Management
- Auto-welcome messages
- Anti-link, Anti-delete, Anti-call
- Admin tools (kick, promote, demote)
- Group scheduling and reminders

## 🚀 Quick Start

### Prerequisites
- Node.js v20 or higher
- WhatsApp account(s)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/HamzabAmirni1/bot-hamza-amirni.git
cd bot-hamza-amirni
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure settings**
Edit `settings.js` to customize:
- Bot name and prefix
- Owner numbers
- Extra numbers for multi-session
- API keys

4. **Start the bot**
```bash
npm start
```

5. **Pair your WhatsApp**
- Choose option [1] to start all sessions
- Choose option [2] to add a new number
- Enter the pairing code in WhatsApp app

## 📱 Multi-Session Setup

### Adding Extra Numbers
In `settings.js`, add phone numbers to the `extraNumbers` array:
```javascript
extraNumbers: ['212631342792', '212600000000'],
```

### Cloud Deployment (Koyeb, Heroku, etc.)
Set environment variables for each session:
- `SESSION_ID` - Main session
- `SESSION_2` - Second session
- `SESSION_3` - Third session
- etc.

## 🛠️ Available Commands

### Maintenance
```bash
npm run cleanup    # Clean temporary files
npm run dev        # Run with nodemon (auto-restart)
```

## 📂 Project Structure

```
bot-hamza-amirni/
├── commands/          # Command modules
│   ├── ai/           # AI-related commands
│   ├── islamic/      # Islamic services
│   ├── thmil/        # Download commands
│   ├── tools/        # Utility commands
│   ├── group/        # Group management
│   ├── fun/          # Entertainment
│   ├── game/         # Games
│   ├── info/         # Information
│   └── owner/        # Owner-only commands
├── lib/              # Helper libraries
├── lang/             # Language files (AR, EN, MA)
├── data/             # Bot data storage
├── media/            # Media assets
├── index.js          # Main entry point
├── settings.js       # Configuration
└── cleanup.js        # Cleanup script
```

## 🔧 Configuration

### settings.js
```javascript
{
  botName: 'حمزة اعمرني',
  prefix: '.',
  ownerNumber: ['212624855939'],
  pairingNumber: '212656918407',
  extraNumbers: ['212631342792'],
  // ... more settings
}
```

## 🌐 Deployment

### Koyeb
1. Fork this repository
2. Connect to Koyeb
3. Set environment variables (SESSION_ID, etc.)
4. Deploy!

### Docker
```bash
docker build -t hamza-amirni .
docker run -e SESSION_ID=$SESSION_ID hamza-amirni
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC License

## 👨‍💻 Author

**Hamza Amirni**
- Instagram: [@hamza_amirni_01](https://instagram.com/hamza_amirni_01)
- WhatsApp: [Channel](https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p)

## ⚠️ Disclaimer

This bot is for educational purposes. Use responsibly and respect WhatsApp's Terms of Service.

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- All contributors and users

---

⚔️ **Made with ❤️ by Hamza Amirni**
