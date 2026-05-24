import { Bot } from "mineflayer";
import PacketManager from "./PacketManager";
import VoiceServer from "./VoiceServer";
import { Group, player_state } from "./data/types";
import AudioPlayer from "./AudioPlayer";
export declare class SVC_Data {
    static groups: Map<Buffer, Group>;
    static players: Map<Buffer, player_state>;
    static joinedGroup: Buffer | undefined;
    static compatibilityVersion: number;
}
export declare class SVC_OBJ {
    static PacketManager: PacketManager;
    static AudioPlayer: AudioPlayer;
    static VoiceServer: VoiceServer;
}
export declare function init(bot: Bot): void;
//# sourceMappingURL=simple_voice_chat.d.ts.map