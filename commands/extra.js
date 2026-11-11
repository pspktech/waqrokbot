const { spawn, spawnSync } = require('child_process')
const config = require('../config')

const reminders = new Set()

function getJsRuntimeArgs() {
  const deno = spawnSync('deno', ['--version'], { stdio: 'ignore' })
  if (!deno.error && deno.status === 0) return ['--js-runtimes', 'deno']

  const node = spawnSync('node', ['--version'], { encoding: 'utf8' })
  const major = Number.parseInt((node.stdout || '').trim().replace(/^v/, '').split('.')[0], 10)
  return !node.error && node.status === 0 && major >= 22 ? ['--js-runtimes', 'node'] : []
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout)
      reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
    })
  })
}

async function menu(sock, jid, msg) {
  const text = `*${config.BOT_NAME} MENU*

*General*
.ping - Check bot status
.bot - Bot information
.menu - Show this menu

*Media*
.sticker - Image/video meeda reply chesi use cheyyi
.save - View-once image/video meeda reply chesi use cheyyi
.secret <PIN> <message> - Create encrypted secret
.unlock <ID> <PIN> - Unlock secret once
.autodestroy <10s> <message> - Delete bot message after delay
.antidelete on/off/status - Restore deleted text (admin)
.yta <YouTube link> - Download audio
.ytv <YouTube link> - Download video
.ytsearch <query> - Search YouTube
.ig <Instagram link> - Download reel

*Tools*
.weather <city> - Current weather
.translate <language> <text> - Translate text
.remind <10m|1h|30s> <message> - Set reminder

*AI*
.ask <question> - Ask AI directly
.enquiry <question> - AI enquiry alias
.ai status - Check AI status (admin)
.ai reply on/off - Toggle automatic AI replies (admin)
.ai enquiry on/off - Toggle .ask/.enquiry responses (admin)
.ai status - Show both AI statuses (admin)
.aion / .aioff / .aistatus - Legacy automatic-reply aliases (admin)
.autoreply add keyword | reply - Add custom reply (admin)
.autoreply list / delete keyword - Manage custom replies (admin)`
  await sock.sendMessage(jid, { text }, { quoted: msg })
}

async function ytsearch(sock, jid, msg, query) {
  try {
    await sock.sendMessage(jid, { text: '🔎 YouTube search chestunna...' }, { quoted: msg })
    const output = await runYtDlp([
      ...getJsRuntimeArgs(), '--flat-playlist', '--dump-single-json', '--skip-download', `ytsearch5:${query}`
    ])
    const data = JSON.parse(output)
    const entries = (data.entries || []).filter(Boolean).slice(0, 5)
    if (!entries.length) throw new Error('No results')

    const text = entries.map((entry, index) => {
      const duration = entry.duration_string || (entry.duration ? `${Math.round(entry.duration)}s` : 'unknown')
      return `${index + 1}. *${entry.title || 'Untitled'}*\n${entry.webpage_url || entry.url}\nDuration: ${duration}`
    }).join('\n\n')
    await sock.sendMessage(jid, { text: `*YouTube Results*\n\n${text}` }, { quoted: msg })
  } catch (error) {
    console.error('YouTube search error:', error.message)
    await sock.sendMessage(jid, { text: '❌ Search fail ayindi. yt-dlp update chesi try cheyyi.' }, { quoted: msg })
  }
}

async function weather(sock, jid, msg, city) {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { 'User-Agent': 'waqrokbot/1.0' }
    })
    if (!response.ok) throw new Error(`weather status ${response.status}`)
    const data = await response.json()
    const current = data.current_condition?.[0]
    const area = data.nearest_area?.[0]
    if (!current || !area) throw new Error('city not found')

    const location = `${area.areaName?.[0]?.value || city}, ${area.country?.[0]?.value || ''}`
    const text = `*Weather: ${location}*
🌡️ Temperature: ${current.temp_C}°C
🤚 Feels like: ${current.FeelsLikeC}°C
☁️ Condition: ${current.weatherDesc?.[0]?.value || 'Unknown'}
💧 Humidity: ${current.humidity}%
💨 Wind: ${current.windspeedKmph} km/h`
    await sock.sendMessage(jid, { text }, { quoted: msg })
  } catch (error) {
    console.error('Weather error:', error.message)
    await sock.sendMessage(jid, { text: '❌ City dorakaledu. Example: `.weather Hyderabad`' }, { quoted: msg })
  }
}

async function translate(sock, jid, msg, language, text) {
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.search = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: language, dt: 't', q: text }).toString()
    const response = await fetch(url)
    if (!response.ok) throw new Error(`translation status ${response.status}`)
    const data = await response.json()
    const translated = (data[0] || []).map((part) => part[0]).join('')
    if (!translated) throw new Error('empty translation')
    await sock.sendMessage(jid, { text: `*Translation (${language})*\n${translated}` }, { quoted: msg })
  } catch (error) {
    console.error('Translation error:', error.message)
    await sock.sendMessage(jid, { text: '❌ Translation fail ayindi. Example: `.translate en namaste`' }, { quoted: msg })
  }
}

function parseDuration(value) {
  const match = /^([1-9]\d*)(s|m|h|d)$/i.exec(value)
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit]
  const duration = amount * multiplier
  return duration <= 7 * 86400000 ? duration : null
}

async function remind(sock, jid, msg, durationText, reminderText) {
  const duration = parseDuration(durationText)
  if (!duration || !reminderText) {
    return sock.sendMessage(jid, { text: '❌ Use: `.remind 10m drink water` (max 7 days)' }, { quoted: msg })
  }

  const reminder = setTimeout(async () => {
    reminders.delete(reminder)
    await sock.sendMessage(jid, { text: `⏰ Reminder: ${reminderText}` })
  }, duration)
  reminders.add(reminder)
  const minutes = Math.max(1, Math.round(duration / 60000))
  await sock.sendMessage(jid, { text: `✅ Reminder set for about ${minutes} minute(s).` }, { quoted: msg })
}

module.exports = { menu, ytsearch, weather, translate, remind, parseDuration }
