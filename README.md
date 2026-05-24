<h1 align="center">mineflayer-simple-voice-chat</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/mineflayer-simple-voice-chat"><img src="https://img.shields.io/npm/v/mineflayer-simple-voice-chat.svg?logo=npm" alt="NPM version"></a>
  <a href="https://github.com/YOUR_USERNAME/mineflayer-simple-voice-chat/actions?query=workflow%3A%22CI%22"><img src="https://img.shields.io/github/actions/workflow/status/YOUR_USERNAME/mineflayer-simple-voice-chat/ci.yml?label=CI&logo=github" alt="Build Status"></a>
  <a href="https://discord.gg/GsEFRM8"><img src="https://img.shields.io/static/v1.svg?label=OFFICIAL&message=DISCORD&color=blue&logo=discord&style=for-the-badge" alt="Official Discord"></a>
</p>

<p align="center">
  A <a href="https://github.com/PrismarineJS/mineflayer">mineflayer</a> plugin that connects bots to <a href="https://modrinth.com/plugin/simple-voice-chat">Simple Voice Chat</a> servers.
  Play audio through the bot's mic, record nearby players, and manage voice groups.
</p>

## Features

- **Play audio** — Queue any audio file and stream it through the bot's microphone using FFmpeg
- **Record** — Capture audio from nearby players speaking in voice chat
- **Voice groups** — List, create, join, and leave voice groups
- **Full Simple Voice Chat protocol** — AES-128-GCM encrypted UDP, Opus encoding, auth handshake

## Installation

```bash
npm install mineflayer-simple-voice-chat
```

## Quick Start

```js
const mineflayer = require('mineflayer');
const voicechat = require('mineflayer-simple-voice-chat');

const bot = mineflayer.createBot({ host: 'localhost' });
bot.loadPlugin(voicechat.plugin);

bot.on('voicechat_connected', () => {
  // Play a sound file (place in ./audio/ or use absolute path)
  bot.simple_voice_chat.AudioPlayer.enQueue('music.mp3');

  // Record other players
  bot.simple_voice_chat.AudioPlayer.startListening({
    file: 'recording.pcm'
  });
});
```

## API

### Events

All events are emitted on the `bot` instance.

| Event | Payload | Description |
|-------|---------|-------------|
| `voicechat_connected` | — | Bot has authenticated and is ready to send/receive audio |
| `voicechat_sound` | [`Sound`](#sound) | Raw Opus audio received from another player (emitted even without `startListening`) |
| `voicechat_joined_group` | `{ uuid: Buffer \| undefined, wrong_password: boolean }` | Bot joined or left a group |
| `audio_player_initialised` | — | Audio player is ready |
| `audioplayer_song_start` | — | A queued song started playing |
| `audioplayer_song_end` | — | The current song finished |
| `audioplayer_stop` | — | Playback was stopped |
| `audioplayer_pause` | — | Playback was paused |
| `audioplayer_play` | — | Playback resumed |
| `audioplayer_skip` | — | Current song was skipped |
| `audioplayer_enqueue` | — | A file was added to the queue |

---

### `bot.simple_voice_chat`

The main namespace. All methods and properties below are accessed through it.

#### Audio Playback

##### `AudioPlayer.enQueue(file)`
Add a file to the playback queue. If `audio/{file}` does not exist, falls back to `{file}`. The file is converted to 48 kHz mono PCM via FFmpeg and cached in `pcm/`.

```js
bot.simple_voice_chat.AudioPlayer.enQueue('music.mp3');
bot.simple_voice_chat.AudioPlayer.enQueue('/absolute/path/to/sound.wav');
bot.simple_voice_chat.AudioPlayer.enQueue('raw.pcm'); // raw s16le PCM
```

##### `AudioPlayer.playNow(file)`
Play a file immediately, bypassing the queue.

```js
bot.simple_voice_chat.AudioPlayer.playNow('alert.wav');
```

##### `AudioPlayer.stop()`
Stop playback and clear the queue.

##### `AudioPlayer.pause()` / `AudioPlayer.play()`
Pause / resume the current song.

##### `AudioPlayer.skip()`
Skip the current song.

##### `AudioPlayer.isPlaying()`
Returns `true` if a song is currently playing.

##### `AudioPlayer.getQueue()`
Returns `{ current: string | null, upcoming: string[] }`.

##### `AudioPlayer.setQueueLoop(shouldLoop)`
If `true`, the last played song is re-queued after finishing.

---

#### Receiving Audio

##### `AudioPlayer.startListening(options)`
Start receiving audio from other players.

```js
// Record to file + callback
bot.simple_voice_chat.AudioPlayer.startListening({
  file: 'recordings/chat.pcm',
  callback: (data) => {
    console.log(`Audio from ${data.sender}`, {
      whispering: data.whispering,
      distance: data.distance,
      category: data.category,
    });
  }
});

// Callback only (no file)
bot.simple_voice_chat.AudioPlayer.startListening({
  callback: (data) => processAudio(data)
});
```

The callback receives a [`SoundCallbackData`](#soundcallbackdata) object.

##### `AudioPlayer.stopListening()`
Stop receiving audio. Closes the file stream and clears per-sender Opus decoders.

---

#### Raw UDP

##### `sendUDP(payload)`
Send an arbitrary buffer over the authenticated UDP channel.

##### `sendPCM(pcm, whispering?)`
Encode raw PCM (48 kHz, mono, s16le) as Opus and send it as a mic packet.

```js
bot.simple_voice_chat.sendPCM(pcmBuffer, false);
```

---

#### Voice Groups

##### `createGroup(name, password?, type?)`
Create a new voice group.

```js
// Public group
bot.simple_voice_chat.createGroup('lobby');

// Password-protected closed (invite-only) group
bot.simple_voice_chat.createGroup('staff', 'secret123', 'closed');

// Open group (auto-join on connect)
bot.simple_voice_chat.createGroup('afk', undefined, 'open');
```

`type` can be `'normal'` | `'open'` | `'closed'` (default `'normal'`).

##### `joinGroup(groupId, password?)`
Join a group by its UUID (Buffer).

##### `joinGroupName(name, password?)`
Join a group by its display name. Searches the cached group list.

```js
bot.simple_voice_chat.joinGroupName('lobby');
bot.simple_voice_chat.joinGroupName('staff', 'secret123');
```

##### `leaveGroup()`
Leave the current group.

##### `listGroups()`
Returns an array of all known groups (received from server via `add_group` packets).

```js
const groups = bot.simple_voice_chat.listGroups();
// [{ id: Buffer, name: 'lobby', hasPassword: false, persistent: false, hidden: false, type: 'normal' }, ...]
```

##### `getJoinedGroup()`
Returns the UUID (`Buffer | null`) of the group the bot is currently in.

---

#### Low-Level Access

| Property | Type | Description |
|----------|------|-------------|
| `protodef` | ProtoDef instance | The protocol definition object |
| `data` | SVC_Data | Raw state (`groups`, `players`, `joinedGroup`) |
| `AudioPlayer` | AudioPlayer instance | The audio player singleton |

---

### Type Definitions

#### `Sound`
Received in the `voicechat_sound` event.

```ts
interface Sound {
  sender: Buffer;
  data: Buffer;
  sequencenumber: bigint;
  category: string | undefined;
  whispering: boolean | undefined;
  distance: number | undefined;
  location: { x: number; y: number; z: number } | undefined;
}
```

#### `SoundCallbackData`
Received in the `startListening` callback.

```ts
interface SoundCallbackData {
  sender: string;
  pcm: Buffer;           // decoded PCM (48 kHz, mono, s16le)
  sequenceNumber: bigint;
  whispering?: boolean;
  distance?: number;
  location?: { x: number; y: number; z: number };
  category?: string;
}
```

#### `GroupInfo`
Returned by `listGroups()`.

```ts
interface GroupInfo {
  id: Buffer;
  name: String;
  hasPassword: boolean;
  persistent: boolean;
  hidden: boolean;
  type: string;
}
```

---

## How It Works

1. On `spawn`, the bot requests a voice secret via the `voicechat:request_secret` channel.
2. The server responds with `voicechat:secret` containing connection info (host, port, AES key, codec, etc.).
3. The bot opens a UDP connection and authenticates with `AuthenticatePacket`.
4. Once authenticated, it sends `ConnectionCheckPacket` and waits for `ConnectionCheckAck`.
5. On ack, the bot sends `update_state` with `{ disabled: false, disconnected: false }` — now it's visible on voice chat.
6. Audio playback: PCM → Opus → MicPacket over UDP.
7. Audio receive: UDP → decrypt → Opus → decode → PCM → file/callback.
8. Groups use Minecraft custom payload channels (`voicechat:create_group`, `voicechat:set_group`, etc.).

## Audio File Support

Any format FFmpeg can read is supported: `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`, `.pcm` (raw s16le), etc.

Files placed in the `audio/` directory are resolved by name. Absolute paths work too.

Converted PCM files are cached in `pcm/` with a channel-count suffix (e.g. `file.mp3.1ch.pcm`) and reused on subsequent plays.

## Requirements

- Node.js >= 18
- **FFmpeg** must be installed on your system and available in PATH
  - Debian/Ubuntu: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: download from [ffmpeg.org](https://ffmpeg.org/) or `winget install ffmpeg`
- **libopus** development headers (for building `@discordjs/opus`):
  - Debian/Ubuntu: `sudo apt install libopus-dev`
  - macOS: `brew install opus`
  - Windows: included in `@discordjs/opus` prebuilds

## Acknowledgements

- [Forester302](https://github.com/Forester302) — original plugin author
- [henkelmax](https://github.com/henkelmax) — Simple Voice Chat
- Inspired by [mineflayer-plasmovoice](https://github.com/Maks-gaming/mineflayer-plasmovoice)

## License

MIT
