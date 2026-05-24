import { OpusEncoder } from 'node-opus';
import { spawnSync, spawn } from 'child_process';
const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms))

import * as fs from 'fs';
import * as path from 'path';

import { Bot } from 'mineflayer';
import { Sound } from './data/types';
import { SVC_OBJ } from './simple_voice_chat';

export interface SoundCallbackData {
	sender: string;
	pcm: Buffer;
	sequenceNumber: bigint;
	whispering?: boolean;
	distance?: number;
	location?: { x: number; y: number; z: number };
	category?: string;
}

export default class AudioPlayer {
	SAMPLE_RATE = 48_000
	CHANNELS = 1

	bot: Bot;

	initialised = false

	queue = []
	currentSong: string | null = null
	shouldLoop = false

	queueRunning = false
	songPlaying = false

	shouldStopQueue = false
	shouldStopSong = false

	paused = false

	listening = false
	private receiveFileStream: fs.WriteStream | null = null
	private senderDecoders: Map<string, OpusEncoder> = new Map()
	private receiveHandler: ((data: SoundCallbackData) => void) | null = null

	async init(bot: Bot) {
		if (this.initialised) return

		this.bot = bot;

		const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
		if (!hasFfmpeg) {
			console.error("\x1b[43m\x1b[30m")
			console.error("  ⚠ MINEFLAYER-SIMPLE-VOICE-CHAT: ffmpeg not found in PATH  ")
			console.error("  Audio playback requires ffmpeg for format conversion.      ")
			console.error("  Install it: https://ffmpeg.org/download.html               ")
			console.error("\x1b[0m")
		}

		const directory = "pcm";
		try {
			for (const file of await fs.promises.readdir(directory)) {
				await fs.promises.unlink(path.join(directory, file));
			}
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
		}
		this.initialised = true
		bot.emit("audio_player_initialised")
	}

	async enQueue(file: string) {
		if (!this.initialised) return

		let sourcePath = `audio/${file}`
		if (!fs.existsSync(sourcePath)) {
			sourcePath = file
			if (!fs.existsSync(sourcePath)) {
				this.bot.emit("error", new Error(`Audio file not found: tried audio/${file} and ${file}`))
				return false
			}
		}

		const pcmPath = `pcm/${file}.${this.CHANNELS}ch.pcm`
		const shouldConvert = !fs.existsSync(pcmPath) || fs.statSync(pcmPath).size === 0
		if (shouldConvert) {
			await this.convertToPcm(sourcePath, pcmPath)
		}
		this.queue.push(pcmPath)
		this.bot.emit("audioplayer_enqueue")
		this.runQueue()
	}

	private async convertToPcm(sourcePath: string, pcmPath: string): Promise<void> {
		if (fs.existsSync(pcmPath)) await fs.promises.unlink(pcmPath).catch(() => {})
		const isRawPCM = sourcePath.endsWith('.pcm')
		try {
			const chunks: Uint8Array[] = await new Promise((resolve, reject) => {
				const result: Uint8Array[] = []
				const args = ['-y', '-i', sourcePath]
				if (isRawPCM) {
					args.push('-f', 's16le', '-ar', String(this.SAMPLE_RATE), '-ac', String(this.CHANNELS))
				}
				args.push('-f', 's16le', '-ac', String(this.CHANNELS), '-ar', String(this.SAMPLE_RATE), '-filter:a', `atempo=${1.0.toFixed(1)}`, 'pipe:1')
				const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'inherit'] })
				let closed = false
				const done = () => { if (!closed) { closed = true; resolve(result) } }
				proc.on('error', reject)
				proc.stdout.on('data', (chunk: Buffer) => result.push(chunk))
				proc.stdout.on('end', done)
				proc.on('exit', (code) => { if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}`)); else done() })
			})
			await fs.promises.writeFile(pcmPath, Buffer.concat(chunks))
		} catch (err) {
			this.bot.emit("error", new Error(`Audio conversion failed for ${sourcePath}: ${(err as Error).message}`))
		}
	}

	private deQueue(): string {
		return this.queue.shift()
	}

	async runQueue() {
		if (!this.initialised) return
		if (this.queueRunning) return
		this.queueRunning = true
		while (!this.shouldStopQueue) {
			if (!this.songPlaying && this.queue.length > 0 && SVC_OBJ.VoiceServer.connected) {
				let song = this.deQueue()
				this.sendPCM(song)
			}
			await sleep(5)
		}
		this.queueRunning = false
		this.shouldStopQueue = false
	}

	isPlaying(): boolean {
		return this.songPlaying
	}

	getQueue(): { current: string | null; upcoming: string[] } {
		return { current: this.currentSong, upcoming: [...this.queue] }
	}

	async playNow(file: string) {
		if (!this.initialised) return false
		let sourcePath = `audio/${file}`
		if (!fs.existsSync(sourcePath)) {
			sourcePath = file
			if (!fs.existsSync(sourcePath)) {
				this.bot.emit("error", new Error(`Audio file not found: tried audio/${file} and ${file}`))
				return false
			}
		}
		const pcmPath = `pcm/${file}.${this.CHANNELS}ch.pcm`
		if (!fs.existsSync(pcmPath) || fs.statSync(pcmPath).size === 0) {
			await this.convertToPcm(sourcePath, pcmPath)
		}
		this.streamPCM(pcmPath)
	}

	private async streamPCM(pcmPath: string) {
		const pcmBuffer = await fs.promises.readFile(pcmPath)
		const opusEncoder = new OpusEncoder(this.SAMPLE_RATE, this.CHANNELS)
		const frameSize = (this.SAMPLE_RATE / 1_000) * 20 * this.CHANNELS * 2
		const frameDelay = BigInt(20_000_000)
		for (let i = 0; i < pcmBuffer.length; i += frameSize) {
			const frame = pcmBuffer.subarray(i, i + frameSize)
			if (frame.length !== frameSize) break
			const startTime = process.hrtime.bigint()
			const opus = opusEncoder.encode(frame)
			this.bot.simple_voice_chat.sendPCM(opus)
			const elapsedTime = process.hrtime.bigint() - startTime
			const sleepTime = frameDelay - elapsedTime
			if (sleepTime > 0) {
				await sleep(Number(sleepTime) / 1000000)
			}
		}
	}

	async sendPCM(file: string) {
		this.bot.emit("audioplayer_song_start")
		this.currentSong = file
		const pcmBuffer = fs.promises.readFile(file)
		const opusEncoder = new OpusEncoder(this.SAMPLE_RATE, this.CHANNELS);

		const frameSize = (this.SAMPLE_RATE / 1_000) * 20 * this.CHANNELS * 2

		const frameDelay = BigInt(20_000_000)

		this.songPlaying = true
		for (let i = 0; i < (await pcmBuffer).length; i += frameSize) {
			while (this.paused) {
				if (this.shouldStopSong) {
					break
				}
				await sleep(1)
			}
			if (this.shouldStopSong) {
				break
			}
			const startTime: bigint = process.hrtime.bigint()
			//cut frame out
			const frame = (await pcmBuffer).subarray(i, i + frameSize);
			if (frame.length !== frameSize) {
				break;
			}
			const opus = opusEncoder.encode(frame);
			this.bot.simple_voice_chat.sendPCM(opus)
			const endTime = process.hrtime.bigint();
			const elapsedTime = endTime - startTime;
			const sleepTime =frameDelay - elapsedTime;
			if (sleepTime > 0) {
				await sleep(Number(sleepTime) / 1000000)
			}
		}
		this.currentSong = null
		this.shouldStopSong = false
		this.paused = false
		this.songPlaying = false
		if (this.shouldLoop) {
			this.queue.push(file)
		}
		this.bot.emit("audioplayer_song_end")
	}

	stop() {
		this.shouldStopQueue = true
		this.shouldStopSong = true
		this.bot.once("audioplayer_song_end", () => {
			this.bot.emit("audioplayer_stop")
		})
	}

	pause() {
		this.paused = true
		this.bot.emit("audioplayer_pause")
	}

	play() {
		this.paused = false
		this.bot.emit("audioplayer_play")
	}
	
	skip() {
		this.shouldStopSong = true
		this.bot.once("audioplayer_song_end", () => {
			this.bot.emit("audioplayer_skip")
		})
	}

	setQueueLoop(shouldLoop: boolean) {
		this.shouldLoop = shouldLoop
	}

	startListening(options: {
		callback?: (data: SoundCallbackData) => void
		file?: string
	}) {
		if (this.listening) this.stopListening()
		this.listening = true

		if (options.file) {
			const dir = path.dirname(options.file)
			if (dir) fs.mkdirSync(dir, { recursive: true })
			this.receiveFileStream = fs.createWriteStream(options.file, { flags: 'a' })
		}

		this.receiveHandler = options.callback || null;
		(this.bot as any).on("voicechat_sound", this.onSoundPacket)
	}

	stopListening() {
		if (!this.listening) return
		this.listening = false;
		(this.bot as any).removeListener("voicechat_sound", this.onSoundPacket)
		if (this.receiveFileStream) {
			this.receiveFileStream.end()
			this.receiveFileStream = null
		}
		this.senderDecoders.clear()
		this.receiveHandler = null
	}

	private onSoundPacket = (sound: Sound) => {
		if (!this.listening) return
		const sender = typeof sound.sender === 'string' ? sound.sender : (sound.sender as any).toString();
		let dec = this.senderDecoders.get(sender)
		if (!dec) {
			dec = new OpusEncoder(this.SAMPLE_RATE, this.CHANNELS)
			this.senderDecoders.set(sender, dec)
		}
		const pcm = dec.decode(sound.data)
		if (this.receiveFileStream) {
			this.receiveFileStream.write(pcm)
		}
		if (this.receiveHandler) {
			this.receiveHandler({
				sender,
				pcm,
				sequenceNumber: sound.sequencenumber,
				whispering: sound.whispering,
				distance: sound.distance,
				location: sound.location,
				category: sound.category,
			})
		}
	}
}