//import crypto from "crypto";
import { ProtoDef } from "protodef";
import * as crypto from "crypto";

// Types
import { Bot } from "mineflayer";
import { Client } from "minecraft-protocol";
import protocol from "./data/protocol";

export default class PacketManager {
	bot: Bot;
	protoDef = new ProtoDef(false);
	
	secret: Buffer;
	
	async init(bot: Bot) {
		this.bot = bot;

		this.protoDef.addProtocol(protocol as any, ["channels"])
		this.protoDef.addProtocol(protocol as any, ["udp"])
		this.protoDef.addTypes(protocol.types as any)

		this.bot.on("login", async () => {
			this.registerChannels(this.bot._client)
			this.registerTypes(this.bot._client)
		})
	}

	async init_udp() {

	}

	private async registerChannels(client: Client) {
		const types = (this.protoDef as any).types
		client.registerChannel("voicechat:secret", types.secret, true);
		client.registerChannel("voicechat:player_state", types.player_state, true);
		client.registerChannel("voicechat:player_states", types.player_states, true);
		client.registerChannel("voicechat:add_group", types.add_group, true);
		client.registerChannel("voicechat:remove_group", types.remove_group, true);
		client.registerChannel("voicechat:joined_group", types.joined_group, true);
	}

	private async registerTypes(client: Client) {
        for (const [key, value] of Object.entries((this.protoDef as any).types)) {
            client.registerChannel(key, value);
        }
    }

	parsePacket(packet_type: string, packet: Buffer) {
		return this.protoDef.parsePacketBuffer(packet_type, packet)
	}

	createPacket(packet_type: string, packet: {}): Buffer {
		return this.protoDef.createPacketBuffer(packet_type, packet)
	}

	public encrypt(data: Buffer): Buffer {
		const iv = crypto.randomBytes(12);
		const cipher = crypto.createCipheriv('aes-128-gcm', this.secret, iv);
		const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
		const tag = cipher.getAuthTag();
		return Buffer.concat([iv, encrypted, tag]);
	}

	public decrypt(payloadArray: Array<number>): Buffer {
		const payload = Buffer.from(payloadArray)
		const iv = payload.subarray(0, 12);
		const tag = payload.subarray(payload.length - 16);
		const encryptedData = payload.subarray(12, payload.length - 16);
		const decipher = crypto.createDecipheriv('aes-128-gcm', this.secret, iv);
		decipher.setAuthTag(tag);
		const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
		return decryptedData;
	}
}