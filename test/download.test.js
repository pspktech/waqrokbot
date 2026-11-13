const test = require('node:test')
const assert = require('node:assert/strict')
const download = require('../commands/download')
const secret = require('../commands/secret')
const protection = require('../commands/protection')
const media = require('../commands/media')
const afk = require('../commands/afk')

test('accepts HTTP and HTTPS URLs only', () => {
  assert.equal(download.isHttpUrl('https://www.youtube.com/watch?v=test'), true)
  assert.equal(download.isHttpUrl('http://instagram.com/reel/test'), true)
  assert.equal(download.isHttpUrl('javascript:alert(1)'), false)
  assert.equal(download.isHttpUrl('not a url'), false)
})

test('exports both downloader commands', () => {
  assert.equal(typeof download.downloadYoutube, 'function')
  assert.equal(typeof download.downloadInstagram, 'function')
})

test('encrypts and decrypts secret messages with the correct PIN only', () => {
  const encrypted = secret.encryptMessage('private Telugu message', '1234')
  assert.equal(secret.decryptMessage(encrypted, '1234'), 'private Telugu message')
  assert.throws(() => secret.decryptMessage(encrypted, '9999'))
})

test('extracts media from view-once and ephemeral wrappers', () => {
  const wrapped = {
    ephemeralMessage: {
      message: {
        viewOnceMessageV2: {
          message: { imageMessage: { mimetype: 'image/jpeg', caption: 'test' } }
        }
      }
    }
  }
  assert.equal(media.getMediaMessage(wrapped).type, 'image')
  assert.equal(media.getMediaMessage(wrapped).message.caption, 'test')
})

test('exports AFK status controls', () => {
  assert.equal(typeof afk.setAfk, 'function')
  assert.equal(typeof afk.clear, 'function')
  assert.equal(typeof afk.notify, 'function')
  assert.equal(typeof afk.status, 'function')
})
