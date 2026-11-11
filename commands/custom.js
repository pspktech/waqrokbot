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

function parseCommand(args) {
  const raw = args.join(' ').trim()
  const match = raw.match(/^(add|delete|del|remove|list)\b\s*(.*)$/i)
  if (!match) return { action: raw.toLowerCase() }

  const action = match[1].toLowerCase()
  const rest = match[2].trim()
  if (action === 'list') return { action }
  if (action !== 'add') return { action, keyword: rest.toLowerCase() }

  const pipe = rest.indexOf('|')
  if (pipe >= 0) {
    return {
      action,
      keyword: rest.slice(0, pipe).trim().toLowerCase(),
      reply: rest.slice(pipe + 1).trim()
    }
  }

  const parts = rest.split(/\s+/)
  return {
    action,
    keyword: (parts.shift() || '').toLowerCase(),
    reply: parts.join(' ').trim()
  }
}

async function manage(sock, jid, msg, args) {
  const { action, keyword, reply } = parseCommand(args)
  const replies = loadReplies()

  if (action === 'add') {
    if (!keyword || !reply) {
      return sock.sendMessage(jid, { text: 'Use: `.autoreply add hi | Hello ra`' }, { quoted: msg })
    }
    replies[keyword] = reply
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

module.exports = { manage, respond, find, parseCommand }
