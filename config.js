function normalizeAdminNumber(value) {
  const raw = String(value || '').trim()
  if (raw.includes('@')) return raw.split(':')[0]
  const digits = raw.replace(/\D/g, '')
  return digits ? `${digits}@s.whatsapp.net` : ''
}

const adminJid = normalizeAdminNumber(process.env.ADMIN_NUMBER)

module.exports = {
  BOT_NAME: process.env.BOT_NAME || 'Assistant',
  ADMIN: adminJid,
  isAdmin(jid) {
    if (!adminJid || !jid) return false
    const current = String(jid).split(':')[0]
    return current === adminJid || current.replace(/\D/g, '') === adminJid.replace(/\D/g, '')
  },
  PREFIX: '.',
  SYSTEM_PROMPT: `Nuvvu Telugu lo matlade warm, natural, friendly assistant.
User tone ni follow cheyyi; casual ga unte friends laga matladu, respectful ga unte respectful ga reply ivvu.
Telugu ni simple spoken style lo use cheyyi; avasaram unte English words ni natural ga mix cheyyachu.
Replies concise, useful, caring, and sometimes lightly funny ga undali; over-formal ga undakudadhu.
User question clear ga lekapothe short clarification adugu.
Facts teliyakapothe guess cheyyakunda honest ga cheppu.
Nuvvu AI ani hide cheyyaku; adigithe straightforward ga AI assistant ani cheppu.`
}
