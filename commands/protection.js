const fs = require('fs-extra')
const path = require('path')

const SETTINGS_FILE = path.resolve('./protection_status.json')
const CACHE_TTL = 60 * 60 * 1000
const messageCache = new Map()
let antiDeleteEnabled = true

try {
  const saved = fs.readJsonSync(SETTINGS_FILE)
  antiDeleteEnabled = saved.antiDelete ?? true
} catch {}

function saveSettings() {
  fs.writeJsonSync(SETTINGS_FILE, { antiDelete: antiDeleteEnabled }, { spaces: 2 })
}

function parseDuration(value) {
  const match = /^([1-9]\d*)(s|m|h)$/i.exec(value || '')
  if (!match) return null
  const amount = Number(match[1])
  const multiplier = { s: 1000, m: 60000, h: 3600000 }[match[2].toLowerCase()]
  const duration = amount * multiplier
  return duration >= 5000 && duration <= 24 * 60 * 60 * 1000 ? duration : null
}

function extractContent(msg) {
  const content = msg.message || {}
  const text = content.conversation || content.extendedTextMessage?.text
  if (text) return { kind: 'text', text }

  const media = [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
    ['documentMessage', 'document'],
    ['stickerMessage', 'sticker']
  ].find(([key]) => content[key])
  if (media) {
    return {
      kind: media[1],
      text: content[media[0]].caption || `[${media[1]} message]`
    }
  }
  return null
}

function remember(msg) {
  if (!msg?.key?.id || !msg.key.remoteJid) return
  const content = extractContent(msg)
  if (!content) return
  messageCache.set(msg.key.id, {
    jid: msg.key.remoteJid,
    sender: msg.key.participant || msg.key.remoteJid,
    ...content,
    savedAt: Date.now()
  })

  for (const [id, cached] of messageCache) {
    if (Date.now() - cached.savedAt > CACHE_TTL) messageCache.delete(id)
  }
}

async function handleUpdate(sock, item) {
  if (!antiDeleteEnabled) return
  const protocol = item.update?.message?.protocolMessage
  if (!protocol || protocol.type !== 0 || !protocol.key?.id) return

  const cached = messageCache.get(protocol.key.id)
  messageCache.delete(protocol.key.id)
  if (!cached) return

  const label = cached.kind === 'text' ? cached.text : `${cached.text}\n(Media content itself cannot be restored after deletion.)`
  await sock.sendMessage(cached.jid, {
    text: `🛡️ Anti-delete\nDeleted message recovered:\n\n${label}`
  })
}

async function autodestroy(sock, jid, msg, durationText, text) {
  const duration = parseDuration(durationText)
  if (!duration || !text) {
    return sock.sendMessage(jid, {
      text: 'Use: `.autodestroy 10s secret message`\nTime: 5s to 24h.'
    }, { quoted: msg })
  }

  const sent = await sock.sendMessage(jid, { text }, { quoted: msg })
  setTimeout(async () => {
    try {
      if (sent?.key) await sock.sendMessage(jid, { delete: sent.key })
    } catch (error) {
      console.error('Auto-destroy error:', error.message)
    }
  }, duration)
}

async function toggle(sock, jid, msg, value) {
  antiDeleteEnabled = value
  saveSettings()
  await sock.sendMessage(jid, {
    text: value ? '✅ Anti-delete ON chesaa.' : '❌ Anti-delete OFF chesaa.'
  }, { quoted: msg })
}

async function status(sock, jid, msg) {
  await sock.sendMessage(jid, {
    text: `🛡️ Anti-delete: ${antiDeleteEnabled ? 'ON' : 'OFF'}\n⏳ Auto-destroy: `.concat('Use `.autodestroy 10s message`')
  }, { quoted: msg })
}

module.exports = { remember, handleUpdate, autodestroy, toggle, status, parseDuration }
