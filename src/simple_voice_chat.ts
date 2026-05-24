import { Bot } from "mineflayer";

//types
import PacketManager from "./PacketManager";
import VoiceServer from "./VoiceServer";
import { Group, secret_packet, player_state_packet, player_state, player_states_packet, add_group_packet, remove_group_packet, joined_group_packet, Sound } from "./data/types";
import AudioPlayer from "./AudioPlayer";

export class SVC_Data {
	static groups: Map<Buffer, Group>
	static players: Map<Buffer, player_state>
	static joinedGroup: Buffer | undefined = undefined
	static compatibilityVersion: number = 20
}

const MC_TO_SVC: Record<string, number> = {
	"1.20.2": 18,
	"1.20.3": 19,
	"1.20.4": 19,
	"1.20.5": 19,
	"1.20.6": 19,
	"1.21": 20,
	"1.21.1": 20,
	"1.21.2": 20,
	"1.21.3": 20,
	"1.21.4": 20,
	"1.21.5": 20,
	"1.21.6": 20,
	"1.21.7": 20,
	"1.21.8": 20,
	"1.21.9": 20,
	"1.21.10": 20,
	"1.21.11": 20,
}

function resolveSVCVersion(mcVersion: string): number {
	const norm = mcVersion.replace(/^.*?(\d+\.\d+(?:\.\d+)?).*$/, "$1")
	const exact = MC_TO_SVC[norm]
	if (exact) return exact
	const major = norm.match(/^(\d+\.\d+)/)
	if (major) {
		for (const [key, value] of Object.entries(MC_TO_SVC)) {
			if (key.startsWith(major[1])) return value
		}
	}
	return 20
}

export class SVC_OBJ {
	static PacketManager: PacketManager
	static AudioPlayer: AudioPlayer
	static VoiceServer: VoiceServer = new VoiceServer()
}

export function init(bot: Bot) {
	//Init
	SVC_OBJ.PacketManager = new PacketManager()
	SVC_OBJ.PacketManager.init(bot)
	SVC_OBJ.AudioPlayer = new AudioPlayer()
	SVC_OBJ.AudioPlayer.init(bot)
	SVC_Data.groups = new Map()
	SVC_Data.players = new Map()
	bot.on("spawn", () => {
		const mcVersion = (bot as any).version || "1.21"
		SVC_Data.compatibilityVersion = resolveSVCVersion(mcVersion)
		if (SVC_Data.compatibilityVersion !== 20) {
			console.error("\x1b[41m\x1b[97m")
			console.error(`  ⚠ MINEFLAYER-SIMPLE-VOICE-CHAT: Server is MC ${mcVersion} (SVC compat ${SVC_Data.compatibilityVersion})  `)
			console.error("  This library only supports SVC compatibility version 20 (MC 1.21.x).        ")
			console.error("  The voice chat connection will likely fail.                                 ")
			console.error("\x1b[0m")
			bot.emit("error", new Error(`Incompatible SVC version: server needs ${SVC_Data.compatibilityVersion}, library supports 20`))
		}
		bot._client.write("custom_payload", {channel: "voicechat:request_secret", data: SVC_OBJ.PacketManager.createPacket("request_secret", {"version": SVC_Data.compatibilityVersion})})
	})

	//Message Channels
	bot._client.on("voicechat:secret", (packet: secret_packet) => {
		if (connectionCheckTimer) {
			clearInterval(connectionCheckTimer)
			connectionCheckTimer = null
		}
		SVC_OBJ.VoiceServer.close()
		SVC_OBJ.VoiceServer = new VoiceServer()
		SVC_OBJ.VoiceServer.init(bot, packet)
	})
	bot._client.on("voicechat:player_state", (packet: player_state_packet) => {
		if (SVC_Data.players.has(packet.player_state.uuid)) {SVC_Data.players.delete(packet.player_state.uuid)}
		if (packet.player_state.disconnected) {return}
		SVC_Data.players.set(packet.player_state.uuid, packet.player_state)
	})
	bot._client.on("voicechat:player_states", (packet: player_states_packet) => {
		SVC_Data.players = new Map()
		for (let player of packet.player_states) {
			if (player.disconnected) {continue}
			SVC_Data.players.set(player.uuid, player)
		}
	})
	bot._client.on("voicechat:add_group", (packet: add_group_packet) => {
		if (SVC_Data.groups.has(packet.group.id)) {SVC_Data.groups.delete(packet.group.id)}
		SVC_Data.groups.set(packet.group.id, packet.group)
	})
	bot._client.on("voicechat:remove_group", (packet: remove_group_packet) => {
		SVC_Data.groups.delete(packet.uuid)
	})
	bot._client.on("voicechat:joined_group", (packet: joined_group_packet) => {
		SVC_Data.joinedGroup = packet.uuid || undefined
		bot.emit("voicechat_joined_group", { uuid: packet.uuid || undefined, wrong_password: packet.wrong_password })
	})


	//UDP Server
	let connectionCheckTimer: ReturnType<typeof setInterval> | null = null
	let authenticated = false

	bot._client.on("SVC_AuthenticateAck", (data) => {
		if (authenticated) return
		authenticated = true
		SVC_OBJ.VoiceServer.cancelAuthRetry()

		const connCheckPkt = SVC_OBJ.PacketManager.createPacket("packet", {
			"id": "ConnectionCheckPacket",
			"data": {}
		})
		const sendConnCheck = () => SVC_OBJ.VoiceServer.send(connCheckPkt)
		sendConnCheck()
		connectionCheckTimer = setInterval(sendConnCheck, 1000)
	})
	bot._client.on("SVC_ConnectionCheckAck", (data) => {
		if (connectionCheckTimer) {
			clearInterval(connectionCheckTimer)
			connectionCheckTimer = null
		}
		SVC_OBJ.VoiceServer.connected = true;
		bot.emit("voicechat_connected")
		bot._client.write("custom_payload", {
			channel: "voicechat:update_state",
			data: SVC_OBJ.PacketManager.createPacket("update_state", { disabled: false, disconnected: false })
		})
	})
	bot._client.on("SVC_Ping", (data) => {
		SVC_OBJ.VoiceServer.send(SVC_OBJ.PacketManager.createPacket("packet", {
			"id": "PingPacket",
			"data": {
				"id": data.id,
				"timestamp": data.timestamp
			}
		}))
	})
	bot._client.on("SVC_KeepAlive", (data) => {
		SVC_OBJ.VoiceServer.send(SVC_OBJ.PacketManager.createPacket("packet", {
			"id": "KeepAlivePacket",
			"data": {}
		}))
	})
	bot._client.on("SVC_PlayerSound", (data: Sound) => {
		bot.emit("voicechat_sound", {
			sender: data.sender,
			data: Buffer.from(data.data),
			sequencenumber: data.sequencenumber,
			category: data.category || undefined,
			whispering: (data as any).flags?.whisper === 1,
			distance: (data as any).distance,
			location: (data as any).location || undefined,
		} as Sound)
	})
	bot._client.on("SVC_GroupSound", (data) => {
		bot.emit("voicechat_sound", {
			sender: data.sender,
			data: Buffer.from(data.data),
			sequencenumber: data.sequencenumber,
			category: data.category || undefined,
			whispering: false,
			distance: undefined,
			location: undefined,
		} as Sound)
	})
	bot._client.on("SVC_LocationSound", (data) => {
		bot.emit("voicechat_sound", {
			sender: data.sender,
			data: Buffer.from(data.data),
			sequencenumber: data.sequencenumber,
			category: data.category || undefined,
			whispering: false,
			distance: (data as any).distance,
			location: (data as any).location || undefined,
		} as Sound)
	})
}