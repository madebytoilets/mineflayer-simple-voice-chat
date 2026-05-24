import * as dgram from 'dgram';
import { Bot } from 'mineflayer';
import { secret_packet } from './data/types';
export default class VoiceServer {
    MAGIC_NUMBER: number;
    bot: Bot;
    host: string;
    port: number;
    playerUUID: string;
    secret: Buffer;
    udpSocket: dgram.Socket;
    connected: boolean;
    authRetryTimer: ReturnType<typeof setInterval> | null;
    init(bot: Bot, data: secret_packet): void;
    cancelAuthRetry(): void;
    close(): void;
    private parseAddress;
    private handler;
    send(payload: Buffer): void;
}
//# sourceMappingURL=VoiceServer.d.ts.map