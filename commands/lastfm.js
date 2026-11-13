async function recentTrack(sock, jid, msg, username) {
  const apiKey = process.env.LASTFM_API_KEY
  const user = username || process.env.LASTFM_USERNAME
  if (!apiKey || !user) {
    return sock.sendMessage(jid, {
      text: '❌ Last.fm setup missing. `.env` lo LASTFM_API_KEY and LASTFM_USERNAME set cheyyi, or `.lastfm username` use cheyyi.'
    }, { quoted: msg })
  }

  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    url.search = new URLSearchParams({
      method: 'user.getrecenttracks',
      user,
      api_key: apiKey,
      format: 'json',
      limit: '1'
    }).toString()
    const response = await fetch(url, { headers: { 'User-Agent': 'waqrokbot/1.0' } })
    if (!response.ok) throw new Error(`Last.fm status ${response.status}`)
    const data = await response.json()
    if (data.error) throw new Error(data.message || 'Last.fm request failed')

    const track = data.recenttracks?.track?.[0]
    if (!track) {
      return sock.sendMessage(jid, { text: `🎵 ${user} recent tracks dorakaledu.` }, { quoted: msg })
    }

    const playing = track['@attr']?.nowplaying === 'true' ? '▶️ Now playing' : '🎵 Last played'
    const artist = track.artist?.['#text'] || 'Unknown artist'
    const album = track.album?.['#text'] || 'Unknown album'
    const link = track.url ? `\n🔗 ${track.url}` : ''
    await sock.sendMessage(jid, {
      text: `${playing}\n\n*${track.name || 'Unknown track'}*\nArtist: ${artist}\nAlbum: ${album}\nUser: ${user}${link}`
    }, { quoted: msg })
  } catch (error) {
    console.error('Last.fm error:', error.message)
    await sock.sendMessage(jid, { text: '❌ Last.fm user dorakaledu or API setup check cheyyi.' }, { quoted: msg })
  }
}

module.exports = { recentTrack }
