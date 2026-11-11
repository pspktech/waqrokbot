const fs = require('fs-extra')
const path = require('path')
const OpenAI = require('openai')
const config = require('../config')

const AI_STATUS_FILE = path.resolve('./ai_status.json')
let status = { chat: true, enquiry: true }

if (fs.existsSync(AI_STATUS_FILE)) {
  try {
    const saved = fs.readJsonSync(AI_STATUS_FILE)
    status = {
      chat: saved.chat ?? saved.enabled ?? true,
      enquiry: saved.enquiry ?? true
    }
  } catch (error) {
    console.error('AI status read error:', error.message)
  }
}

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

function saveStatus() {
  fs.writeJsonSync(AI_STATUS_FILE, { chat: status.chat, enquiry: status.enquiry }, { spaces: 2 })
}

function getMemory(jid) {
  const file = path.join('./memory', jid.replace(/[^a-zA-Z0-9]/g, '_') + '.json')
  if (fs.existsSync(file)) return fs.readJsonSync(file)
  return []
}

function saveMemory(jid, messages) {
  const file = path.join('./memory', jid.replace(/[^a-zA-Z0-9]/g, '_') + '.json')
  fs.writeJsonSync(file, messages.slice(-14))
}

async function askAI(jid, userMessage) {
  const history = getMemory(jid)
  const messages = [
    { role: 'system', content: config.SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ]

  try {
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages,
      temperature: 0.8,
      max_tokens: 500
    })

    const reply = response.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error('AI returned an empty response')
    history.push({ role: 'user', content: userMessage })
    history.push({ role: 'assistant', content: reply })
    saveMemory(jid, history)
    return reply
  } catch (err) {
    console.error('AI Error:', err.message)
    return 'Ippudu konchem problem undi, konni seconds lo try cheyyi.'
  }
}

function setChatEnabled(enable) {
  status.chat = enable
  saveStatus()
}

function setEnquiryEnabled(enable) {
  status.enquiry = enable
  saveStatus()
}

module.exports = {
  aiEnabled: () => status.chat,
  chatEnabled: () => status.chat,
  enquiryEnabled: () => status.enquiry,

  async toggle(sock, jid, msg, enable, type = 'chat') {
    if (type === 'enquiry') setEnquiryEnabled(enable)
    else setChatEnabled(enable)
    const label = type === 'enquiry' ? 'AI enquiry' : 'AI automatic chat reply'
    await sock.sendMessage(jid, {
      text: enable ? `✅ ${label} ON chesaa` : `❌ ${label} OFF chesaa`
    }, { quoted: msg })
  },

  async status(sock, jid, msg) {
    await sock.sendMessage(jid, {
      text: `*AI Status*\n\n💬 Automatic chat reply: ${status.chat ? 'ON' : 'OFF'}\n❓ AI enquiry (.ask/.enquiry): ${status.enquiry ? 'ON' : 'OFF'}`
    }, { quoted: msg })
  },

  askAI
}
