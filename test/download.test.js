const test = require('node:test')
const assert = require('node:assert/strict')
const download = require('../commands/download')

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
