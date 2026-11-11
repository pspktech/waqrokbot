require('dotenv').config()
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const fs = require('fs-extra')
const config = require('./config')
const ai = require('./commands/ai')
const general = require('./commands/general')
const download = require('./commands/download')

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
    if (!msg.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid
    if (jid.endsWith('@g.us') || jid === 'status@broadcast') return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!text) return

    const isAdmin = jid === config.ADMIN
    const lower = text.toLowerCase().trim()
    const args = text.trim().split(/\s+/)
    const cmd = args[0].toLowerCase()

    // ===== COMMANDS =====
    if (cmd === '.ping') return general.ping(sock, jid, msg)
    if (cmd === '.bot' || cmd === '.info') return general.botinfo(sock, jid, msg)

    if (cmd === '.ai' && isAdmin) {
      if (args[1] === 'on') return ai.toggle(sock, jid, msg, true)
      if (args[1] === 'off') return ai.toggle(sock, jid, msg, false)
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
