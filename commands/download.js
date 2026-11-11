const { spawn, spawnSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')

const DOWNLOAD_DIR = path.resolve('./downloads')

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getJsRuntimeArgs() {
  const deno = spawnSync('deno', ['--version'], { stdio: 'ignore' })
  if (!deno.error && deno.status === 0) return ['--js-runtimes', 'deno']

  const node = spawnSync('node', ['--version'], { encoding: 'utf8' })
  const major = Number.parseInt((node.stdout || '').trim().replace(/^v/, '').split('.')[0], 10)
  if (!node.error && node.status === 0 && major >= 22) return ['--js-runtimes', 'node']

  return []
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve()
      reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
    })
  })
}

async function sendDownloadError(sock, jid, msg, message) {
  await sock.sendMessage(jid, { text: message }, { quoted: msg })
}

async function downloadYoutube(sock, jid, msg, url, type = 'audio') {
  if (!isHttpUrl(url)) {
    return sendDownloadError(sock, jid, msg, '❌ Valid YouTube link pampu.')
  }

  const extension = type === 'audio' ? 'mp3' : 'mp4'
  const filePath = path.join(DOWNLOAD_DIR, `youtube_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`)

  try {
    await fs.ensureDir(DOWNLOAD_DIR)
    await sock.sendMessage(jid, { text: '⏳ Download start ayindi...' }, { quoted: msg })

    const runtimeArgs = getJsRuntimeArgs()
    const args = type === 'audio'
      ? [...runtimeArgs, '-x', '--audio-format', 'mp3', '--no-playlist', '-o', filePath, url]
      : [
          ...runtimeArgs,
          '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
          '--merge-output-format', 'mp4',
          '--no-playlist', '-o', filePath, url
        ]

    await runYtDlp(args)

    if (!(await fs.pathExists(filePath))) {
      throw new Error('yt-dlp completed without creating a file')
    }

    if (type === 'audio') {
      await sock.sendMessage(jid, {
        audio: { url: filePath },
        mimetype: 'audio/mpeg'
      }, { quoted: msg })
    } else {
      await sock.sendMessage(jid, {
        video: { url: filePath },
        caption: '✅ Video ready'
      }, { quoted: msg })
    }
  } catch (error) {
    console.error('YouTube download error:', error.message)
    const runtimeHint = getJsRuntimeArgs().length === 0
      ? ' Termux lo `pkg install deno` run cheyyi.'
      : ''
    await sendDownloadError(sock, jid, msg, `❌ Download fail ayindi.${runtimeHint}`)
  } finally {
    await fs.remove(filePath).catch(() => {})
  }
}

async function downloadInstagram(sock, jid, msg, url) {
  if (!isHttpUrl(url)) {
    return sendDownloadError(sock, jid, msg, '❌ Valid Instagram link pampu.')
  }

  const filePath = path.join(DOWNLOAD_DIR, `instagram_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`)

  try {
    await fs.ensureDir(DOWNLOAD_DIR)
    await sock.sendMessage(jid, { text: '⏳ Instagram download start...' }, { quoted: msg })
    await runYtDlp([...getJsRuntimeArgs(), '--no-playlist', '-o', filePath, url])

    if (!(await fs.pathExists(filePath))) {
      throw new Error('yt-dlp completed without creating a file')
    }

    await sock.sendMessage(jid, {
      video: { url: filePath },
      caption: '✅ Reel downloaded'
    }, { quoted: msg })
  } catch (error) {
    console.error('Instagram download error:', error.message)
    await sendDownloadError(sock, jid, msg, '❌ IG download fail. Public reel aa check cheyyi.')
  } finally {
    await fs.remove(filePath).catch(() => {})
  }
}

module.exports = {
  downloadYoutube,
  downloadInstagram,
  isHttpUrl,
  getJsRuntimeArgs
}
