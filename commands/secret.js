const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

const FILE = path.resolve('./secret_messages.json')
const MAX_ATTEMPTS = 5
const EXPIRY_MS = 24 * 60 * 60 * 1000

function loadSecrets() {
  try {
    const data = fs.readJsonSync(FILE)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function saveSecrets(secrets) {
  fs.writeJsonSync(FILE, secrets, { spaces: 2, mode: 0o600 })
}

function deriveKey(pin, salt) {
  return crypto.scryptSync(pin, salt, 32)
}

function encryptMessage(message, pin) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(pin, salt), iv)
  const ciphertext = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()])
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  }
}

function decryptMessage(secret, pin) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(pin, Buffer.from(secret.salt, 'base64')),
    Buffer.from(secret.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(secret.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8')
}

function makeId(secrets) {
  let id
  do {
    id = `S${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  } while (secrets[id])
  return id
}

async function create(sock, jid, msg, pin, message) {
  if (!/^\d{4,12}$/.test(pin || '') || !message) {
    return sock.sendMessage(jid, {
      text: 'Use: `.secret 1234 confidential message`\nPIN 4-12 digits undali.'
    }, { quoted: msg })
  }

  const secrets = loadSecrets()
  const id = makeId(secrets)
  secrets[id] = {
    owner: jid,
    ...encryptMessage(message, pin),
    attempts: 0,
    expiresAt: Date.now() + EXPIRY_MS
  }
  saveSecrets(secrets)

  await sock.sendMessage(jid, {
    text: `🔐 Secret created.\nID: ${id}\n\nUse: .unlock ${id} <PIN>\nExpires in 24 hours.`
  }, { quoted: msg })
}

async function unlock(sock, jid, msg, id, pin) {
  const secrets = loadSecrets()
  const secret = secrets[String(id || '').toUpperCase()]

  if (!secret || secret.owner !== jid) {
    return sock.sendMessage(jid, { text: '❌ Secret ID invalid or not found.' }, { quoted: msg })
  }
  if (Date.now() > secret.expiresAt) {
    delete secrets[String(id).toUpperCase()]
    saveSecrets(secrets)
    return sock.sendMessage(jid, { text: '⌛ Secret expired.' }, { quoted: msg })
  }

  try {
    const message = decryptMessage(secret, pin || '')
    delete secrets[String(id).toUpperCase()]
    saveSecrets(secrets)
    await sock.sendMessage(jid, { text: `🔓 Secret message:\n\n${message}\n\n(Deleted after unlock)` }, { quoted: msg })
  } catch {
    secret.attempts += 1
    if (secret.attempts >= MAX_ATTEMPTS) delete secrets[String(id).toUpperCase()]
    saveSecrets(secrets)
    const remaining = Math.max(0, MAX_ATTEMPTS - secret.attempts)
    await sock.sendMessage(jid, {
      text: remaining ? `❌ Wrong PIN. Attempts left: ${remaining}` : '❌ Too many wrong attempts. Secret deleted.'
    }, { quoted: msg })
  }
}

function cleanup() {
  const secrets = loadSecrets()
  let changed = false
  for (const [id, secret] of Object.entries(secrets)) {
    if (Date.now() > secret.expiresAt) {
      delete secrets[id]
      changed = true
    }
  }
  if (changed) saveSecrets(secrets)
}

module.exports = { create, unlock, cleanup, encryptMessage, decryptMessage }
