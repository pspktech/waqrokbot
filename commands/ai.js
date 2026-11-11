const fs = require('fs-extra')
const path = require('path')
const OpenAI = require('openai')
const config = require('../config')

const AI_STATUS_FILE = './ai_status.json'
let aiEnabled = true

if (fs.existsSync(AI_STATUS_FILE)) {
  aiEnabled = fs.readJsonSync(AI_STATUS_FILE).enabled
}

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

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
  if (!aiEnabled) return null

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

    const reply = response.choices[0].message.content.trim()
    history.push({ role: 'user', content: userMessage })
    history.push({ role: 'assistant', content: reply })
    saveMemory(jid, history)
    return reply
  } catch (err) {
    console.error('AI Error:', err.message)
    return "Ippudu konchem problem undi, konni seconds lo try cheyyi."
  }
}

module.exports = {
  aiEnabled: () => aiEnabled,

  async toggle(sock, jid, msg, enable) {
    aiEnabled = enable
    fs.writeJsonSync(AI_STATUS_FILE, { enabled: aiEnabled })
    await sock.sendMessage(jid, {
      text: enable ? '✅ AI On chesaa' : '❌ AI Off chesaa'
    }, { quoted: msg })
  },

  askAI
}
