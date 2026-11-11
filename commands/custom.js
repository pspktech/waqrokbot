const fs = require('fs-extra')
const path = require('path')

const FILE = path.resolve('./custom_replies.json')

function loadReplies() {
  try {
    const data = fs.readJsonSync(FILE)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function saveReplies(replies) {
  fs.writeJsonSync(FILE, replies, { spaces: 2 })
}

async function manage(sock, jid, msg, args) {
  const action = (args[0] || '').toLowerCase()
  const keyword = (args[1] || '').toLowerCase()
  const reply = args.slice(2).join(' ').trim()
  const replies = loadReplies()

  if (action === 'add') {
    if (!keyword || !reply) {
      return sock.sendMessage(jid, { text: 'Use: `.autoreply add hi | Hello ra`' }, { quoted: msg })
    }
    const separator = args.slice(2).join(' ').split('|')
    const response = separator.length > 1 ? separator.slice(1).join('|').trim() : reply
    replies[keyword] = response
    saveReplies(replies)
    return sock.sendMessage(jid, { text: `✅ Auto reply saved for: ${keyword}` }, { quoted: msg })
  }

  if (action === 'delete' || action === 'del' || action === 'remove') {
    if (!keyword || !replies[keyword]) {
      return sock.sendMessage(jid, { text: '❌ Aa keyword auto reply list lo ledu.' }, { quoted: msg })
    }
    delete replies[keyword]
    saveReplies(replies)
    return sock.sendMessage(jid, { text: `✅ Auto reply deleted: ${keyword}` }, { quoted: msg })
  }

  if (action === 'list') {
    const keys = Object.keys(replies)
    const text = keys.length
      ? `*Custom Auto Replies*\n\n${keys.map((key) => `• ${key} → ${replies[key]}`).join('\n')}`
      : 'Custom auto replies empty ga unnayi.'
    return sock.sendMessage(jid, { text }, { quoted: msg })
  }

  return sock.sendMessage(jid, {
    text: '*Auto Reply Commands*\n.autoreply add keyword | reply\n.autoreply delete keyword\n.autoreply list'
  }, { quoted: msg })
}

function find(text) {
  const normalized = text.toLowerCase().trim()
  const replies = loadReplies()
  const key = Object.keys(replies).find((keyword) => normalized === keyword || normalized.includes(keyword))
  return key ? replies[key] : null
}

async function respond(sock, jid, msg, text) {
  const reply = find(text)
  if (!reply) return false
  await sock.sendMessage(jid, { text: reply }, { quoted: msg })
  return true
}

module.exports = { manage, respond, find }
