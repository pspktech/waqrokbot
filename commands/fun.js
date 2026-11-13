const truths = [
  'Nee phone lo most-used app enti?',
  'Recent ga ninnu genuine ga happy chesina thing enti?',
  'Nee biggest silly fear enti?',
  'Evariki cheppakunda nuvvu chesina funny pani enti?',
  'School or college lo nee funniest memory enti?',
  'Nuvvu change cheskovalani anukune oka habit enti?',
  'Last ga evarini miss ayyav?',
  'Nee secret talent enti?',
  'One day free ga dorikithe em chesthav?',
  'Nee dream travel place enti?',
  'Nuvvu ekkuva overthink chese topic enti?',
  'Nee best friend lo neeku nachche quality enti?'
]

const dares = [
  '30 seconds lo oka funny voice note pampu.',
  'Next message ni only emojis tho send cheyyi.',
  'Nee favourite song lo oka line type cheyyi.',
  'Group lo oka clean joke cheppu.',
  '10 seconds lo 5 Telugu movie names type cheyyi.',
  'Nee current mood ni three words lo describe cheyyi.',
  'Oka imaginary award speech ivvu.',
  'Nee profile status ni 5 minutes funny ga change cheyyi.',
  'Oka tongue twister fast ga cheppadaniki try cheyyi.',
  'Nee day ni movie title laga name cheyyi.',
  'Oka friend ki genuine compliment pampu.',
  'Next reply lo rhyme use cheyyi.'
]

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

async function truth(sock, jid, msg) {
  await sock.sendMessage(jid, { text: `🟢 Truth:\n${pick(truths)}` }, { quoted: msg })
}

async function dare(sock, jid, msg) {
  await sock.sendMessage(jid, { text: `🔴 Dare:\n${pick(dares)}` }, { quoted: msg })
}

async function truthDare(sock, jid, msg) {
  const choice = Math.random() < 0.5 ? truth : dare
  return choice(sock, jid, msg)
}

module.exports = { truth, dare, truthDare, truths, dares }
