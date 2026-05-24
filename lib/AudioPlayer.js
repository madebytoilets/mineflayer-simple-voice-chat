"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_opus_1 = require("node-opus");
const child_process_1 = require("child_process");
const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const simple_voice_chat_1 = require("./simple_voice_chat");
class AudioPlayer {
    constructor() {
        this.SAMPLE_RATE = 48000;
        this.CHANNELS = 1;
        this.initialised = false;
        this.queue = [];
        this.currentSong = null;
        this.shouldLoop = false;
        this.queueRunning = false;
        this.songPlaying = false;
        this.shouldStopQueue = false;
        this.shouldStopSong = false;
        this.paused = false;
        this.listening = false;
        this.receiveFileStream = null;
        this.senderDecoders = new Map();
        this.receiveHandler = null;
        this.onSoundPacket = (sound) => {
            if (!this.listening)
                return;
            const sender = typeof sound.sender === 'string' ? sound.sender : sound.sender.toString();
            let dec = this.senderDecoders.get(sender);
            if (!dec) {
                dec = new node_opus_1.OpusEncoder(this.SAMPLE_RATE, this.CHANNELS);
                this.senderDecoders.set(sender, dec);
            }
            const pcm = dec.decode(sound.data);
            if (this.receiveFileStream) {
                this.receiveFileStream.write(pcm);
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
                });
            }
        };
    }
    init(bot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialised)
                return;
            this.bot = bot;
            const hasFfmpeg = (0, child_process_1.spawnSync)('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
            if (!hasFfmpeg) {
                console.error("\x1b[43m\x1b[30m");
                console.error("  ⚠ MINEFLAYER-SIMPLE-VOICE-CHAT: ffmpeg not found in PATH  ");
                console.error("  Audio playback requires ffmpeg for format conversion.      ");
                console.error("  Install it: https://ffmpeg.org/download.html               ");
                console.error("\x1b[0m");
            }
            const directory = "pcm";
            try {
                for (const file of yield fs.promises.readdir(directory)) {
                    yield fs.promises.unlink(path.join(directory, file));
                }
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    throw e;
            }
            this.initialised = true;
            bot.emit("audio_player_initialised");
        });
    }
    enQueue(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialised)
                return;
            let sourcePath = `audio/${file}`;
            if (!fs.existsSync(sourcePath)) {
                sourcePath = file;
                if (!fs.existsSync(sourcePath)) {
                    this.bot.emit("error", new Error(`Audio file not found: tried audio/${file} and ${file}`));
                    return false;
                }
            }
            const pcmPath = `pcm/${file}.${this.CHANNELS}ch.pcm`;
            const shouldConvert = !fs.existsSync(pcmPath) || fs.statSync(pcmPath).size === 0;
            if (shouldConvert) {
                yield this.convertToPcm(sourcePath, pcmPath);
            }
            this.queue.push(pcmPath);
            this.bot.emit("audioplayer_enqueue");
            this.runQueue();
        });
    }
    convertToPcm(sourcePath, pcmPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs.existsSync(pcmPath))
                yield fs.promises.unlink(pcmPath).catch(() => { });
            const isRawPCM = sourcePath.endsWith('.pcm');
            try {
                const chunks = yield new Promise((resolve, reject) => {
                    const result = [];
                    const args = ['-y', '-i', sourcePath];
                    if (isRawPCM) {
                        args.push('-f', 's16le', '-ar', String(this.SAMPLE_RATE), '-ac', String(this.CHANNELS));
                    }
                    args.push('-f', 's16le', '-ac', String(this.CHANNELS), '-ar', String(this.SAMPLE_RATE), '-filter:a', `atempo=${1.0.toFixed(1)}`, 'pipe:1');
                    const proc = (0, child_process_1.spawn)('ffmpeg', args, { stdio: ['ignore', 'pipe', 'inherit'] });
                    let closed = false;
                    const done = () => { if (!closed) {
                        closed = true;
                        resolve(result);
                    } };
                    proc.on('error', reject);
                    proc.stdout.on('data', (chunk) => result.push(chunk));
                    proc.stdout.on('end', done);
                    proc.on('exit', (code) => { if (code !== 0)
                        reject(new Error(`ffmpeg exited with code ${code}`));
                    else
                        done(); });
                });
                yield fs.promises.writeFile(pcmPath, Buffer.concat(chunks));
            }
            catch (err) {
                this.bot.emit("error", new Error(`Audio conversion failed for ${sourcePath}: ${err.message}`));
            }
        });
    }
    deQueue() {
        return this.queue.shift();
    }
    runQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialised)
                return;
            if (this.queueRunning)
                return;
            this.queueRunning = true;
            while (!this.shouldStopQueue) {
                if (!this.songPlaying && this.queue.length > 0 && simple_voice_chat_1.SVC_OBJ.VoiceServer.connected) {
                    let song = this.deQueue();
                    this.sendPCM(song);
                }
                yield sleep(5);
            }
            this.queueRunning = false;
            this.shouldStopQueue = false;
        });
    }
    isPlaying() {
        return this.songPlaying;
    }
    getQueue() {
        return { current: this.currentSong, upcoming: [...this.queue] };
    }
    playNow(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialised)
                return false;
            let sourcePath = `audio/${file}`;
            if (!fs.existsSync(sourcePath)) {
                sourcePath = file;
                if (!fs.existsSync(sourcePath)) {
                    this.bot.emit("error", new Error(`Audio file not found: tried audio/${file} and ${file}`));
                    return false;
                }
            }
            const pcmPath = `pcm/${file}.${this.CHANNELS}ch.pcm`;
            if (!fs.existsSync(pcmPath) || fs.statSync(pcmPath).size === 0) {
                yield this.convertToPcm(sourcePath, pcmPath);
            }
            this.streamPCM(pcmPath);
        });
    }
    streamPCM(pcmPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const pcmBuffer = yield fs.promises.readFile(pcmPath);
            const opusEncoder = new node_opus_1.OpusEncoder(this.SAMPLE_RATE, this.CHANNELS);
            const frameSize = (this.SAMPLE_RATE / 1000) * 20 * this.CHANNELS * 2;
            const frameDelay = BigInt(20000000);
            for (let i = 0; i < pcmBuffer.length; i += frameSize) {
                const frame = pcmBuffer.subarray(i, i + frameSize);
                if (frame.length !== frameSize)
                    break;
                const startTime = process.hrtime.bigint();
                const opus = opusEncoder.encode(frame);
                this.bot.simple_voice_chat.sendPCM(opus);
                const elapsedTime = process.hrtime.bigint() - startTime;
                const sleepTime = frameDelay - elapsedTime;
                if (sleepTime > 0) {
                    yield sleep(Number(sleepTime) / 1000000);
                }
            }
        });
    }
    sendPCM(file) {
        return __awaiter(this, void 0, void 0, function* () {
            this.bot.emit("audioplayer_song_start");
            this.currentSong = file;
            const pcmBuffer = fs.promises.readFile(file);
            const opusEncoder = new node_opus_1.OpusEncoder(this.SAMPLE_RATE, this.CHANNELS);
            const frameSize = (this.SAMPLE_RATE / 1000) * 20 * this.CHANNELS * 2;
            const frameDelay = BigInt(20000000);
            this.songPlaying = true;
            for (let i = 0; i < (yield pcmBuffer).length; i += frameSize) {
                while (this.paused) {
                    if (this.shouldStopSong) {
                        break;
                    }
                    yield sleep(1);
                }
                if (this.shouldStopSong) {
                    break;
                }
                const startTime = process.hrtime.bigint();
                //cut frame out
                const frame = (yield pcmBuffer).subarray(i, i + frameSize);
                if (frame.length !== frameSize) {
                    break;
                }
                const opus = opusEncoder.encode(frame);
                this.bot.simple_voice_chat.sendPCM(opus);
                const endTime = process.hrtime.bigint();
                const elapsedTime = endTime - startTime;
                const sleepTime = frameDelay - elapsedTime;
                if (sleepTime > 0) {
                    yield sleep(Number(sleepTime) / 1000000);
                }
            }
            this.currentSong = null;
            this.shouldStopSong = false;
            this.paused = false;
            this.songPlaying = false;
            if (this.shouldLoop) {
                this.queue.push(file);
            }
            this.bot.emit("audioplayer_song_end");
        });
    }
    stop() {
        this.shouldStopQueue = true;
        this.shouldStopSong = true;
        this.bot.once("audioplayer_song_end", () => {
            this.bot.emit("audioplayer_stop");
        });
    }
    pause() {
        this.paused = true;
        this.bot.emit("audioplayer_pause");
    }
    play() {
        this.paused = false;
        this.bot.emit("audioplayer_play");
    }
    skip() {
        this.shouldStopSong = true;
        this.bot.once("audioplayer_song_end", () => {
            this.bot.emit("audioplayer_skip");
        });
    }
    setQueueLoop(shouldLoop) {
        this.shouldLoop = shouldLoop;
    }
    startListening(options) {
        if (this.listening)
            this.stopListening();
        this.listening = true;
        if (options.file) {
            const dir = path.dirname(options.file);
            if (dir)
                fs.mkdirSync(dir, { recursive: true });
            this.receiveFileStream = fs.createWriteStream(options.file, { flags: 'a' });
        }
        this.receiveHandler = options.callback || null;
        this.bot.on("voicechat_sound", this.onSoundPacket);
    }
    stopListening() {
        if (!this.listening)
            return;
        this.listening = false;
        this.bot.removeListener("voicechat_sound", this.onSoundPacket);
        if (this.receiveFileStream) {
            this.receiveFileStream.end();
            this.receiveFileStream = null;
        }
        this.senderDecoders.clear();
        this.receiveHandler = null;
    }
}
exports.default = AudioPlayer;
//# sourceMappingURL=AudioPlayer.js.map