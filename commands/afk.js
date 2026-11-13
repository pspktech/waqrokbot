const fs = require('fs-extra')
const path = require('path')

const FILE = path.resolve('./afk_status.json')
let state = { active: false, reason: '', since: 0 }
const notifiedChats = new Set()

try {
  const saved = fs.readJsonSync(FILE)
  state = {
    active: Boolean(saved.active),
    reason: String(saved.reason || ''),
    since: Number(saved.since || 0)
  }
} catch {}

function save() {
  fs.writeJsonSync(FILE, state, { spaces: 2 })
}

function duration() {
  const seconds = Math.max(0, Math.floor((Date.now() - state.since) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

async function setAfk(sock, jid, msg, reason) {
  state = { active: true, reason: reason || 'busy', since: Date.now() }
  notifiedChats.clear()
  save()
  await sock.sendMessage(jid, {
    text: `💤 AFK ON\nReason: ${state.reason}\n\nOwner message vachina tarvata automatic ga back avuthundi.`
  }, { quoted: msg })
}

async function clear(sock, jid, msg) {
  if (!state.active) {
    return sock.sendMessage(jid, { text: '✅ AFK mode already OFF.' }, { quoted: msg })
  }
  const awayFor = duration()
  state = { active: false, reason: '', since: 0 }
  notifiedChats.clear()
  save()
  await sock.sendMessage(jid, { text: `✅ Welcome back! AFK OFF. Away: ${awayFor}` }, { quoted: msg })
}

async function notify(sock, jid, msg) {
  if (!state.active || notifiedChats.has(jid)) return false
  notifiedChats.add(jid)
  const reason = state.reason ? `\nReason: ${state.reason}` : ''
  await sock.sendMessage(jid, {
    text: `💤 Owner ippudu AFK lo unnaru. Later reply chestaru.${reason}\nAway for: ${duration()}`
  }, { quoted: msg })
  return true
}

async function status(sock, jid, msg) {
  if (!state.active) {
    return sock.sendMessage(jid, { text: '✅ AFK mode OFF.' }, { quoted: msg })
  }
  await sock.sendMessage(jid, {
    text: `💤 AFK mode ON\nReason: ${state.reason || 'busy'}\nAway for: ${duration()}`
  }, { quoted: msg })
}

function isActive() {
  return state.active
}

module.exports = { setAfk, clear, notify, status, isActive, duration }
