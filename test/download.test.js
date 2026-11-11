const test = require('node:test')
const assert = require('node:assert/strict')
const download = require('../commands/download')
const custom = require('../commands/custom')

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

test('parses common WhatsApp auto-reply formats', () => {
  assert.deepEqual(custom.parseCommand(['add', 'hi', '|', 'Hello', 'raa']), {
    action: 'add', keyword: 'hi', reply: 'Hello raa'
  })
  assert.deepEqual(custom.parseCommand(['add', 'good', 'morning', 'Good morning']), {
    action: 'add', keyword: 'good', reply: 'morning Good morning'
  })
  assert.deepEqual(custom.parseCommand(['delete', 'hi']), {
    action: 'delete', keyword: 'hi'
  })
})
