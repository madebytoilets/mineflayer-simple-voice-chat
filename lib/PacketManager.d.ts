import { ProtoDef } from "protodef";
import { Bot } from "mineflayer";
export default class PacketManager {
    bot: Bot;
    protoDef: ProtoDef;
    secret: Buffer;
    init(bot: Bot): Promise<void>;
    init_udp(): Promise<void>;
    private registerChannels;
    private registerTypes;
    parsePacket(packet_type: string, packet: Buffer): ExtendedResults;
    createPacket(packet_type: string, packet: {}): Buffer;
    encrypt(data: Buffer): Buffer;
    decrypt(payloadArray: Array<number>): Buffer;
}
//# sourceMappingURL=PacketManager.d.ts.map