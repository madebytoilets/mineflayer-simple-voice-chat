import { Bot } from "mineflayer";
import { SVC_Data } from "./simple_voice_chat";
import { Sound } from "./data/types";
import AudioPlayer from "./AudioPlayer";
export declare function plugin(bot: Bot): void;
interface GroupInfo {
    id: Buffer;
    name: String;
    hasPassword: boolean;
    persistent: boolean;
    hidden: boolean;
    type: string;
}
interface SimpleVoiceChat {
    sendUDP(payload: Buffer): any;
    sendPCM(payload: Buffer): any;
    joinGroup(group: Buffer, password: string): any;
    joinGroupName(groupname: string, password: string): any;
    leaveGroup(): any;
    createGroup(name: string, password?: string, type?: "normal" | "open" | "closed"): any;
    listGroups(): GroupInfo[];
    getJoinedGroup(): Buffer | null;
    compatibilityVersion: number;
    protodef: any;
    data: SVC_Data;
    AudioPlayer: AudioPlayer;
}
declare module 'mineflayer' {
    interface Bot {
        simple_voice_chat: SimpleVoiceChat;
    }
    interface BotEvents {
        voicechat_connected: any;
        voicechat_sound: Sound;
        voicechat_joined_group: {
            uuid: Buffer | undefined;
            wrong_password: boolean;
        };
        audio_player_initialised: any;
        audioplayer_song_start: any;
        audioplayer_song_end: any;
        audioplayer_stop: any;
        audioplayer_pause: any;
        audioplayer_play: any;
        audioplayer_skip: any;
        audioplayer_enqueue: any;
    }
}
export {};
//# sourceMappingURL=index.d.ts.map