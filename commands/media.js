const { spawn } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}

function unwrapMessage(message) {
  return message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.viewOnceMessageV2Extension?.message ||
    message || null
}

function getMediaMessage(message) {
  const content = unwrapMessage(message)
  if (content?.imageMessage) return { type: 'image', message: content.imageMessage }
  if (content?.videoMessage) return { type: 'video', message: content.videoMessage }
  return null
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    process.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    process.on('error', reject)
    process.on('close', (code) => {
      if (code === 0) return resolve()
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`))
    })
  })
}

async function mediaToWebp(media, inputPath, outputPath) {
  const input = await downloadContentFromMessage(media.message, media.type)
  await fs.writeFile(inputPath, await streamToBuffer(input))

  const filter = media.type === 'video'
    ? 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=black'
    : 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=none'

  const args = media.type === 'video'
    ? ['-y', '-i', inputPath, '-t', '6', '-vf', filter, '-an', '-c:v', 'libwebp', '-loop', '0', '-preset', 'default', '-q:v', '70', outputPath]
    : ['-y', '-i', inputPath, '-vf', filter, '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '70', outputPath]

  await runFfmpeg(args)
  return fs.readFile(outputPath)
}

async function sticker(sock, jid, msg) {
  const media = getMediaMessage(msg.message) || getMediaMessage(getQuotedMessage(msg))
  if (!media) {
    return sock.sendMessage(jid, { text: '❌ Image/video meeda reply chesi `.sticker` pampu.' }, { quoted: msg })
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-sticker-'))
  const inputPath = path.join(dir, media.type === 'video' ? 'input.mp4' : 'input.jpg')
  const outputPath = path.join(dir, 'sticker.webp')

  try {
    await sock.sendMessage(jid, { text: '⏳ Sticker prepare chestunna...' }, { quoted: msg })
    const buffer = await mediaToWebp(media, inputPath, outputPath)
    await sock.sendMessage(jid, { sticker: buffer }, { quoted: msg })
  } catch (error) {
    console.error('Sticker error:', error.message)
    await sock.sendMessage(jid, { text: '❌ Sticker create avvaledu. FFmpeg install unda check cheyyi.' }, { quoted: msg })
  } finally {
    await fs.remove(dir).catch(() => {})
  }
}

async function save(sock, jid, msg) {
  const media = getMediaMessage(getQuotedMessage(msg))
  if (!media) {
    return sock.sendMessage(jid, { text: '❌ View-once image/video meeda reply chesi `.save` pampu.' }, { quoted: msg })
  }

  try {
    const stream = await downloadContentFromMessage(media.message, media.type)
    const buffer = await streamToBuffer(stream)
    const payload = media.type === 'image'
      ? { image: buffer, caption: '✅ Saved media' }
      : { video: buffer, caption: '✅ Saved media' }
    await sock.sendMessage(jid, payload, { quoted: msg })
  } catch (error) {
    console.error('Save media error:', error.message)
    await sock.sendMessage(jid, { text: '❌ Media save cheyyalekapoyaa.' }, { quoted: msg })
  }
}

module.exports = { sticker, save }
