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
const secret = require('./commands/secret')
const protection = require('./commands/protection')

fs.ensureDirSync('./memory')
secret.cleanup()

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

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        await protection.handleUpdate(sock, update)
      } catch (error) {
        console.error('Anti-delete error:', error.message)
      }
    }
  })

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
    protection.remember(msg)

    const jid = msg.key.remoteJid
    const isAdmin = config.isAdmin(jid, msg.key.remoteJidAlt, msg.key.participantAlt)
    protection.scheduleAutoDestroy(sock, msg, isAdmin)
    if (jid.endsWith('@g.us') || jid === 'status@broadcast') return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!text) return

    // WhatsApp self-chat messages have fromMe=true. Process only commands there;
    // ignoring other self messages prevents the bot from replying to itself forever.
    const botNumbers = [sock.user?.id, sock.user?.lid]
      .filter(Boolean)
      .map((value) => String(value).replace(/:.*/, '').replace(/\D/g, ''))
    const chatNumbers = [jid, msg.key.remoteJidAlt, msg.key.participantAlt]
      .filter(Boolean)
      .map((value) => String(value).replace(/:.*/, '').replace(/\D/g, ''))
    const isSelfChat = chatNumbers.some((number) => number && botNumbers.includes(number))
    if (isSelfChat && !text.trim().startsWith('.')) return
    if (msg.key.fromMe && (!isSelfChat || !text.trim().startsWith('.'))) return

    const lower = text.toLowerCase().trim()
    const args = text.trim().split(/\s+/)
    const cmd = args[0].toLowerCase()

    // ===== COMMANDS =====
    if (cmd === '.ping') return general.ping(sock, jid, msg)
    if (cmd === '.bot' || cmd === '.info') return general.botinfo(sock, jid, msg)
    if (cmd === '.menu' || cmd === '.help') return extra.menu(sock, jid, msg)
    if (cmd === '.secret') return secret.create(sock, jid, msg, args[1], args.slice(2).join(' '))
    if (cmd === '.unlock') return secret.unlock(sock, jid, msg, args[1], args[2])
    if (cmd === '.autodestroy' || cmd === '.selfdestruct') {
      if (['on', 'off', 'status'].includes(args[1]?.toLowerCase())) {
        if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Global auto-destroy admin matrame change cheyyali.' }, { quoted: msg })
        if (args[1].toLowerCase() === 'status') return protection.status(sock, jid, msg)
        return protection.toggleAutoDestroy(sock, jid, msg, args[1].toLowerCase() === 'on', args[2])
      }
      return protection.autodestroy(sock, jid, msg, args[1], args.slice(2).join(' '))
    }
    if (cmd === '.antidelete') {
      if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Anti-delete admin matrame change cheyyali.' }, { quoted: msg })
      if (args[1] === 'on') return protection.toggle(sock, jid, msg, true)
      if (args[1] === 'off') return protection.toggle(sock, jid, msg, false)
      return protection.status(sock, jid, msg)
    }

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

    const aiType = args[1]?.toLowerCase()
    const isLegacyAiToggle = cmd === '.aion' || cmd === '.aioff' || (cmd === '.ai' && ['on', 'off'].includes(aiType))
    const isAiOnCommand = cmd === '.aion' || (cmd === '.ai' && aiType === 'on')
    const isAiOffCommand = cmd === '.aioff' || (cmd === '.ai' && aiType === 'off')
    const isAiReplyOnCommand = cmd === '.aireplyon' || (cmd === '.ai' && aiType === 'reply' && args[2]?.toLowerCase() === 'on')
    const isAiReplyOffCommand = cmd === '.aireplyoff' || (cmd === '.ai' && aiType === 'reply' && args[2]?.toLowerCase() === 'off')
    const isAiEnquiryOnCommand = cmd === '.aienquiryon' || (cmd === '.ai' && ['enquiry', 'ask'].includes(aiType) && args[2]?.toLowerCase() === 'on')
    const isAiEnquiryOffCommand = cmd === '.aienquiryoff' || (cmd === '.ai' && ['enquiry', 'ask'].includes(aiType) && args[2]?.toLowerCase() === 'off')
    const isAiStatusCommand = cmd === '.aistatus' || (cmd === '.ai' && aiType === 'status')
    if (isLegacyAiToggle || isAiReplyOnCommand || isAiReplyOffCommand || isAiEnquiryOnCommand || isAiEnquiryOffCommand || isAiStatusCommand) {
      if (!isAdmin) {
        console.log(`[AI auth] denied jid=${jid} alt=${msg.key.remoteJidAlt || '-'} admin=${config.ADMIN || '(not set)'}`)
        return sock.sendMessage(jid, {
          text: '❌ Admin permission ledu. `.env` lo mee WhatsApp number ni ADMIN_NUMBER ga set chesi bot restart cheyyi.'
        }, { quoted: msg })
      }
    }
    if (isAdmin && (isAiOnCommand || isAiReplyOnCommand)) {
      return ai.toggle(sock, jid, msg, true, isAiReplyOnCommand ? 'chat' : 'chat')
    }
    if (isAdmin && (isAiOffCommand || isAiReplyOffCommand)) {
      return ai.toggle(sock, jid, msg, false, isAiReplyOffCommand ? 'chat' : 'chat')
    }
    if (isAdmin && isAiEnquiryOnCommand) {
      return ai.toggle(sock, jid, msg, true, 'enquiry')
    }
    if (isAdmin && isAiEnquiryOffCommand) {
      return ai.toggle(sock, jid, msg, false, 'enquiry')
    }
    if (isAdmin && isAiStatusCommand) {
      return ai.status(sock, jid, msg)
    }

    if (cmd === '.ask' || cmd === '.enquiry' || cmd === '.askai') {
      if (!ai.enquiryEnabled()) {
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

    // ===== AI CHAT =====
    if (ai.chatEnabled()) {
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
