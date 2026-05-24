import { Bot } from "mineflayer";
import { SVC_Data, SVC_OBJ, init } from "./simple_voice_chat";
import VoiceServer from "./VoiceServer";
import PacketManager from "./PacketManager";
import { Sound } from "./data/types";
import AudioPlayer from "./AudioPlayer";

export function plugin(bot: Bot) {
    // @ts-ignore
	bot.simple_voice_chat = {}
	init(bot)

    bot.simple_voice_chat.sendUDP = (payload: Buffer) => {
        SVC_OBJ.VoiceServer.send(payload)
    }
    bot.simple_voice_chat.sendPCM = (pcm: Buffer, whispering = false) => {
        bot.simple_voice_chat.sendUDP(SVC_OBJ.PacketManager.protoDef.createPacketBuffer("packet", {
            "id": "MicPacket",
            "data": {
                "data": pcm,
                "sequencenumber": process.hrtime.bigint(),
                "whispering": whispering
            }
        }))
    }
    bot.simple_voice_chat.joinGroup = (group: Buffer, password: string = "") => {
        const pass = String(password)
        bot._client.write("custom_payload", {channel:"voicechat:set_group", data: SVC_OBJ.PacketManager.createPacket("set_group", {
            "uuid": group,
            "password": pass.length > 0 ? pass : undefined
        })})
    }
    bot.simple_voice_chat.joinGroupName = (groupname: string, password: string = "") => {
        for (const group of SVC_Data.groups) {
            if (String(group[1].name) == groupname) {
                bot.simple_voice_chat.joinGroup(group[0], group[1].hasPassword ? password : "")
                return
            }
        }
    }
    bot.simple_voice_chat.leaveGroup = () => {
        bot._client.write("custom_payload", {channel:"voicechat:leave_group", data: Buffer.from([])})
    }
    bot.simple_voice_chat.createGroup = (name: string, password?: string, type: "normal" | "open" | "closed" = "normal") => {
        const pass = password ? String(password) : ""
        bot._client.write("custom_payload", {channel:"voicechat:create_group", data: SVC_OBJ.PacketManager.createPacket("create_group", {
            "name": name,
            "password": pass.length > 0 ? pass : undefined,
            "type": type
        })})
    }
    bot.simple_voice_chat.listGroups = (): GroupInfo[] => {
        const result: GroupInfo[] = []
        for (const [id, group] of SVC_Data.groups) {
            result.push({
                id: id,
                name: group.name,
                hasPassword: group.hasPassword,
                persistent: group.persistent,
                hidden: group.hidden,
                type: group.type,
            })
        }
        return result
    }
    bot.simple_voice_chat.getJoinedGroup = (): Buffer | null => {
        return SVC_Data.joinedGroup ?? null
    }
    bot.simple_voice_chat.compatibilityVersion = SVC_Data.compatibilityVersion
    bot.simple_voice_chat.protodef = SVC_OBJ.PacketManager.protoDef
    bot.simple_voice_chat.data = SVC_Data
    bot.simple_voice_chat.AudioPlayer = SVC_OBJ.AudioPlayer
}

interface GroupInfo {
    id: Buffer;
    name: String;
    hasPassword: boolean;
    persistent: boolean;
    hidden: boolean;
    type: string;
}

interface SimpleVoiceChat {
    sendUDP(payload: Buffer);
    sendPCM(payload: Buffer);
    joinGroup(group: Buffer, password: string);
    joinGroupName(groupname: string, password: string);
    leaveGroup();
    createGroup(name: string, password?: string, type?: "normal" | "open" | "closed");
    listGroups(): GroupInfo[];
    getJoinedGroup(): Buffer | null;
    compatibilityVersion: number;
    protodef;
    data: SVC_Data;
    AudioPlayer: AudioPlayer;
}

declare module 'mineflayer' {
    interface Bot {
        simple_voice_chat: SimpleVoiceChat
    }
    interface BotEvents {
        voicechat_connected
        voicechat_sound: Sound
        voicechat_joined_group: { uuid: Buffer | undefined; wrong_password: boolean }

        audio_player_initialised
        audioplayer_song_start
        audioplayer_song_end
        audioplayer_stop
        audioplayer_pause
        audioplayer_play
        audioplayer_skip
        audioplayer_enqueue
    }
}
