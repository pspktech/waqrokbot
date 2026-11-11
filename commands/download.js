const { exec } = require('child_process')
const fs = require('fs-extra')
const path = require('path')

async function downloadYoutube(sock, jid, msg, url, type = 'audio') {
  try {
    await sock.sendMessage(jid, { text: '⏳ Download start ayindi...' }, { quoted: msg })

    const fileName = `temp_${Date.now()}`
    const output = type === 'audio' ? `\( {fileName}.mp3` : ` \){fileName}.mp4`

    const cmd = type === 'audio'
      ? `yt-dlp -x --audio-format mp3 -o "\( {output}" " \){url}"`
      : `yt-dlp -f "best[height<=720]" -o "\( {output}" " \){url}"`

    exec(cmd, async (error) => {
      if (error) {
        await sock.sendMessage(jid, { text: '❌ Download fail ayindi. Link correct ga unda check cheyyi.' }, { quoted: msg })
        return
      }

      if (type === 'audio') {
        await sock.sendMessage(jid, {
          audio: { url: output },
          mimetype: 'audio/mp4'
        }, { quoted: msg })
      } else {
        await sock.sendMessage(jid, {
          video: { url: output },
          caption: '✅ Video ready'
        }, { quoted: msg })
      }

      // cleanup
      setTimeout(() => fs.remove(output).catch(() => {}), 10000)
    })
  } catch (e) {
    await sock.sendMessage(jid, { text: '❌ Error occhindi' }, { quoted: msg })
  }
}

async function downloadInstagram(sock, jid, msg, url) {
  try {
    await sock.sendMessage(jid, { text: '⏳ Instagram download start...' }, { quoted: msg })

    const fileName = `ig_${Date.now()}.mp4`
    const cmd = `yt-dlp -o "\( {fileName}" " \){url}"`

    exec(cmd, async (error) => {
      if (error) {
        await sock.sendMessage(jid, { text: '❌ IG download fail. Public reel aa check cheyyi.' }, { quoted: msg })
        return
      }

      await sock.sendMessage(jid, {
        video: { url: fileName },
        caption: '✅ Reel downloaded'
      }, { quoted: msg })

      setTimeout(() => fs.remove(fileName).catch(() => {}), 10000)
    })
  } catch (e) {
    await sock.sendMessage(jid, { text: '❌ Error' }, { quoted: msg })
  }
}

module.exports = {
  downloadYoutube,
  downloadInstagram
}
