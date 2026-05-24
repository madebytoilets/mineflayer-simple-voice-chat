const { plugin } = require('..')
const assert = require('assert')

describe('mineflayer-simple-voice-chat', () => {
  it('should export a plugin function', () => {
    assert.strictEqual(typeof plugin, 'function')
  })
})
