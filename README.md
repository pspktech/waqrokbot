
# WhatsApp Grok Bot 🤖

A powerful and fast WhatsApp bot built using Node.js and Baileys library. It is integrated with AI and media downloading features.

## ✨ Features
* 💬 AI Chat (OpenAI / Grok integration)
* 📥 YouTube Video & Audio Downloader
* 📸 Instagram Reel Downloader
* ⚡ Fast, lightweight, and runs on Termux

## 🛠️ Prerequisites
Before running the bot, make sure you have these installed in your Termux:
* Node.js (`pkg install nodejs-lts`)
* Python (`pkg install python`)
* FFmpeg (`pkg install ffmpeg`)
* Deno JavaScript runtime (`pkg install deno`)
* yt-dlp with YouTube support (`pip install -U "yt-dlp[default]"`)

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pspktech/waqrokbot.git
```

2. Navigate to the bot folder:
   ```bash
   cd waqrokbot
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Setup Environment Variables:
   Create a .env file in the root directory and add your API keys:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   BOT_NAME=Grok_Assistant
   ADMIN_NUMBER=919876543210
   # One account (default):
   SESSIONS=main

   # Multiple accounts example:
   # SESSIONS=main,second,third
   # Optional separate admins for named sessions:
   # ADMIN_NUMBER_MAIN=919876543210
   # ADMIN_NUMBER_SECOND=919812345678
   ```

💻 Usage

Start the bot by running:

```bash
node index.js
```

Scan the QR code or use the pairing code in your WhatsApp (Linked Devices) to connect.

### Multiple WhatsApp accounts

Set comma-separated session names in `.env`:

```env
SESSIONS=main,second
ADMIN_NUMBER_MAIN=919876543210
ADMIN_NUMBER_SECOND=919812345678
```

The `main` account keeps using `auth_info/`. Other accounts use separate folders such as `auth_info_second/`. On first start, scan the terminal QR code shown with the matching session name. Each account has its own WhatsApp login and reconnect loop. If a session-specific admin variable is missing, the shared `ADMIN_NUMBER` value is used.

⚠️ Disclaimer

This bot is created for educational purposes only. The developer is not responsible for any misuse.

```

### స్టెప్ 3: ఫైల్ సేవ్ చేయి
పేస్ట్ చేసిన తర్వాత:
1. కీబోర్డ్ లో `CTRL` బటన్ నొక్కి పట్టుకుని `O` (అక్షరం ఓ) నొక్కండి (Save అవుతుంది).
2. ఆ తర్వాత `Enter` కొట్టండి.
3. తర్వాత `CTRL` నొక్కి పట్టుకుని `X` నొక్కండి (Nano ఎడిటర్ నుండి బయటకు వస్తుంది).

### స్టెప్ 4: GitHub కి పుష్ చేయి
ఇప్పుడు ఈ మార్పును GitHub కి పంపించండి. ఈ కమాండ్స్ రన్ చేయండి:
```bash
git add README.md
git commit -m "Updated README with documentation"
git push origin main
```

(పాస్ వర్డ్ అడిగితే మీ Token పేస్ట్ చేయండి).

ఇంతటితో మీ GitHub రిపోజిటరీ ఓపెన్ చేస్తే చాలా అందంగా, ప్రొఫెషనల్ గా కనిపిస్తుంది రా! 🚀
