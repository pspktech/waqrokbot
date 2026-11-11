const config = require('../config')

module.exports = {
  async ping(sock, jid, msg) {
    const start = Date.now()
    await sock.sendMessage(jid, { text: 'Pong!' }, { quoted: msg })
    const end = Date.now()
    await sock.sendMessage(jid, { text: `⚡ Latency: ${end - start}ms` })
  },

  async botinfo(sock, jid, msg) {
    const text = `*🤖 Bot Info*

Name: ${config.BOT_NAME}
Status: Online
AI: On/Off toggle available
Features:
• Natural Telugu chat
• YouTube Audio/Video
• Instagram Reel download
• AFK system
• Auto replies

Made with ❤️`
    await sock.sendMessage(jid, { text }, { quoted: msg })
  }
}
