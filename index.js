require('dotenv').config()
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const fs = require('fs-extra')
const config = require('./config')
const ai = require('./commands/ai')
const general = require('./commands/general')
const download = require('./commands/download')
const extra = require('./commands/extra')
const media = require('./commands/media')
const custom = require('./commands/custom')

fs.ensureDirSync('./memory')

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ Bot connected')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg.message) return

    const jid = msg.key.remoteJid
    if (jid.endsWith('@g.us') || jid === 'status@broadcast') return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!text) return

    // WhatsApp self-chat messages have fromMe=true. Process only commands there;
    // ignoring other self messages prevents the bot from replying to itself forever.
    const botNumber = sock.user?.id?.replace(/:.*/, '').replace(/\D/g, '')
    const chatNumber = jid.replace(/:.*/, '').replace(/\D/g, '')
    const isSelfChat = Boolean(botNumber && chatNumber && botNumber === chatNumber)
    if (isSelfChat && !text.trim().startsWith('.')) return
    if (msg.key.fromMe && (!isSelfChat || !text.trim().startsWith('.'))) return

    const isAdmin = config.isAdmin(jid)
    const lower = text.toLowerCase().trim()
    const args = text.trim().split(/\s+/)
    const cmd = args[0].toLowerCase()

    // ===== COMMANDS =====
    if (cmd === '.ping') return general.ping(sock, jid, msg)
    if (cmd === '.bot' || cmd === '.info') return general.botinfo(sock, jid, msg)
    if (cmd === '.menu' || cmd === '.help') return extra.menu(sock, jid, msg)

    if (cmd === '.sticker' || cmd === '.s') return media.sticker(sock, jid, msg)
    if (cmd === '.save') return media.save(sock, jid, msg)
    if (cmd === '.ytsearch' || cmd === '.yts') {
      if (!args.slice(1).length) return extra.menu(sock, jid, msg)
      return extra.ytsearch(sock, jid, msg, args.slice(1).join(' '))
    }
    if (cmd === '.weather') {
      if (!args.slice(1).length) return extra.weather(sock, jid, msg, 'Hyderabad')
      return extra.weather(sock, jid, msg, args.slice(1).join(' '))
    }
    if (cmd === '.translate' || cmd === '.tr') {
      if (!args[1] || !args.slice(2).length) {
        return sock.sendMessage(jid, { text: 'Use: `.translate en namaste`' }, { quoted: msg })
      }
      return extra.translate(sock, jid, msg, args[1], args.slice(2).join(' '))
    }
    if (cmd === '.remind') {
      return extra.remind(sock, jid, msg, args[1], args.slice(2).join(' '))
    }

    if (cmd === '.autoreply' || cmd === '.customreply') {
      if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Ee command admin matrame use cheyyali.' }, { quoted: msg })
      return custom.manage(sock, jid, msg, args.slice(1))
    }

    const isAiOnCommand = cmd === '.aion' || (cmd === '.ai' && args[1] === 'on')
    const isAiOffCommand = cmd === '.aioff' || (cmd === '.ai' && args[1] === 'off')
    const isAiStatusCommand = cmd === '.aistatus' || (cmd === '.ai' && args[1] === 'status')
    if (isAiOnCommand || isAiOffCommand || isAiStatusCommand) {
      if (!isAdmin) {
        return sock.sendMessage(jid, {
          text: '❌ Admin permission ledu. `.env` lo mee WhatsApp number ni ADMIN_NUMBER ga set chesi bot restart cheyyi.'
        }, { quoted: msg })
      }
    }
    if (isAdmin && isAiOnCommand) {
      return ai.toggle(sock, jid, msg, true)
    }
    if (isAdmin && isAiOffCommand) {
      return ai.toggle(sock, jid, msg, false)
    }
    if (isAdmin && isAiStatusCommand) {
      return ai.status(sock, jid, msg)
    }

    if (cmd === '.ask' || cmd === '.enquiry' || cmd === '.askai') {
      if (!ai.aiEnabled()) {
        return sock.sendMessage(jid, { text: '❌ AI currently OFF undi. Admin `.ai on` cheyyali.' }, { quoted: msg })
      }
      const question = args.slice(1).join(' ').trim()
      if (!question) return sock.sendMessage(jid, { text: 'Use: `.ask mee question`' }, { quoted: msg })
      const reply = await ai.askAI(jid, question)
      if (reply) return sock.sendMessage(jid, { text: reply }, { quoted: msg })
    }

    if (cmd === '.yta' && args[1]) {
      return download.downloadYoutube(sock, jid, msg, args[1], 'audio')
    }
    if (cmd === '.ytv' && args[1]) {
      return download.downloadYoutube(sock, jid, msg, args[1], 'video')
    }
    if ((cmd === '.ig' || cmd === '.insta') && args[1]) {
      return download.downloadInstagram(sock, jid, msg, args[1])
    }

    if (!lower.startsWith('.') && await custom.respond(sock, jid, msg, text)) return

    // ===== AI CHAT =====
    if (ai.aiEnabled()) {
      await sock.sendPresenceUpdate('composing', jid)
      const reply = await ai.askAI(jid, text)
      if (reply) {
        await sock.sendMessage(jid, { text: reply }, { quoted: msg })
      }
      await sock.sendPresenceUpdate('paused', jid)
    }
  })
}

startBot()
