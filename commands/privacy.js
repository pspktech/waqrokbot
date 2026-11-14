const fs = require('fs-extra')
const path = require('path')

const FILE = path.resolve('./privacy_status.json')
let hideOnline = true

try {
  const saved = fs.readJsonSync(FILE)
  hideOnline = saved.hideOnline ?? true
} catch {}

function save() {
  fs.writeJsonSync(FILE, { hideOnline }, { spaces: 2 })
}

function isHidden() {
  return hideOnline
}

async function apply(sock) {
  try {
    await sock.sendPresenceUpdate(hideOnline ? 'unavailable' : 'available')
  } catch (error) {
    console.error('Privacy presence error:', error.message)
  }
}

async function toggle(sock, jid, msg, value) {
  hideOnline = value
  save()
  await apply(sock)
  await sock.sendMessage(jid, {
    text: value
      ? '🕵️ Hide online ON. Bot online ga kanipinchadu.'
      : '👁️ Hide online OFF. Bot available presence use chestundi.'
  }, { quoted: msg })
}

async function status(sock, jid, msg) {
  await sock.sendMessage(jid, {
    text: `🕵️ Hide online: ${hideOnline ? 'ON' : 'OFF'}\n✓ Typing presence: not sent\n✓ Read receipts: bot manually mark cheyyadu`
  }, { quoted: msg })
}

module.exports = { isHidden, apply, toggle, status }
