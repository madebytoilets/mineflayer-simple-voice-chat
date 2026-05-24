const mineflayer = require('mineflayer')
const voicechat = require('mineflayer-simple-voice-chat')

const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'VoiceBot',
  auth: 'offline'
})

bot.loadPlugin(voicechat.plugin)

bot.on('voicechat_connected', () => {
  // Queue a sound file to play (place in ./audio/ or use absolute path)
  bot.simple_voice_chat.AudioPlayer.enQueue('music.mp3')

  // Start recording other players
  bot.simple_voice_chat.AudioPlayer.startListening({
    file: 'recordings/chat.pcm',
    callback: (data) => {
      console.log(`Audio from ${data.sender}`)
    }
  })

  // Create a voice group
  bot.simple_voice_chat.createGroup('my-group', undefined, 'normal')

  // List available groups
  console.log(bot.simple_voice_chat.listGroups())
})

bot.on('voicechat_sound', (sound) => {
  console.log('Raw sound packet received:', sound.sender.toString())
})
