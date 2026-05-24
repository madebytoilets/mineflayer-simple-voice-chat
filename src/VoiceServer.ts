import * as dgram  from 'dgram';
import { Bot } from 'mineflayer';

//types
import { secret_packet } from './data/types';
import { SVC_OBJ } from './simple_voice_chat';

export default class VoiceServer {

	MAGIC_NUMBER = 255

	bot: Bot;

	host: string;
	port: number;
	playerUUID: string;

	secret: Buffer;
	
	udpSocket = dgram.createSocket('udp4');

	connected = false;

	authRetryTimer: ReturnType<typeof setInterval> | null = null

	init(bot: Bot, data: secret_packet) {
		this.udpSocket.on("error", (err) => {
			bot.emit("error", new Error(`VoiceChat UDP error: ${err.message}`))
		})
		this.udpSocket.on("close", () => { console.log("UDP Connection closed")})
		this.udpSocket.on("message", this.handler.bind(this));

		this.bot = bot
		this.playerUUID = data.playerUUID
		
		const parsed = this.parseAddress(data.voiceHost, bot._client.socket.remoteAddress, data.serverPort)
		this.host = parsed.host
		this.port = parsed.port
		
		this.secret = data.secret
		SVC_OBJ.PacketManager.secret = this.secret

		const authPacket = SVC_OBJ.PacketManager.createPacket("packet", {
			"id": "AuthenticatePacket",
			"data": {
				"playerUUID": this.playerUUID,
				"secret": this.secret
			}
		})

		const sendAuth = () => this.send(authPacket)
		sendAuth()
		this.authRetryTimer = setInterval(sendAuth, 1000)
	}

	cancelAuthRetry() {
		if (this.authRetryTimer) {
			clearInterval(this.authRetryTimer)
			this.authRetryTimer = null
		}
	}

	close() {
		this.cancelAuthRetry()
		try {
			this.udpSocket.close()
		} catch (e) {}
	}

	private parseAddress(voiceHost: string, serverIP: string, serverPort: number): { host: string; port: number } {
		let host = serverIP
		let port = serverPort
		if (!voiceHost || voiceHost.length === 0) {
			return { host, port }
		}
		const onlyDigits = /^\d+$/
		if (onlyDigits.test(voiceHost)) {
			const parsedPort = parseInt(voiceHost, 10)
			if (parsedPort > 0 && parsedPort <= 65535) {
				port = parsedPort
			}
			return { host, port }
		}
		try {
			const uri = new URL("voicechat://" + voiceHost)
			if (uri.hostname) {
				host = uri.hostname
			}
			if (uri.port) {
				port = parseInt(uri.port, 10)
			}
		} catch (e) {
			this.bot.emit("error", new Error(`Failed to parse voice host: ${voiceHost}`))
		}
		return { host, port }
	}

	private async handler(msg: Buffer, _: dgram.RemoteInfo) {
		const network_message = SVC_OBJ.PacketManager.parsePacket("client_network_message", msg);
		if (network_message.data.magic_number != this.MAGIC_NUMBER) {return}
		const payload = SVC_OBJ.PacketManager.decrypt(network_message.data.payload)
		const packet = SVC_OBJ.PacketManager.parsePacket("packet", payload)
		this.bot._client.emit(`SVC_${packet.data.id.replace("Packet", "")}`, (packet.data.data))
	}

	send(payload: Buffer) {
		const enc_payload = SVC_OBJ.PacketManager.encrypt(payload)
		const network_message = SVC_OBJ.PacketManager.createPacket("server_network_message", {
			"magic_number": this.MAGIC_NUMBER,
			"playerUUID": this.playerUUID,
			"payload": enc_payload
		})
		this.udpSocket.send(network_message, this.port, this.host)
	}
}