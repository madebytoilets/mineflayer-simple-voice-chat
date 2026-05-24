import { Bot } from 'mineflayer';
export interface SoundCallbackData {
    sender: string;
    pcm: Buffer;
    sequenceNumber: bigint;
    whispering?: boolean;
    distance?: number;
    location?: {
        x: number;
        y: number;
        z: number;
    };
    category?: string;
}
export default class AudioPlayer {
    SAMPLE_RATE: number;
    CHANNELS: number;
    bot: Bot;
    initialised: boolean;
    queue: any[];
    currentSong: string | null;
    shouldLoop: boolean;
    queueRunning: boolean;
    songPlaying: boolean;
    shouldStopQueue: boolean;
    shouldStopSong: boolean;
    paused: boolean;
    listening: boolean;
    private receiveFileStream;
    private senderDecoders;
    private receiveHandler;
    init(bot: Bot): Promise<void>;
    enQueue(file: string): Promise<boolean>;
    private convertToPcm;
    private deQueue;
    runQueue(): Promise<void>;
    isPlaying(): boolean;
    getQueue(): {
        current: string | null;
        upcoming: string[];
    };
    playNow(file: string): Promise<boolean>;
    private streamPCM;
    sendPCM(file: string): Promise<void>;
    stop(): void;
    pause(): void;
    play(): void;
    skip(): void;
    setQueueLoop(shouldLoop: boolean): void;
    startListening(options: {
        callback?: (data: SoundCallbackData) => void;
        file?: string;
    }): void;
    stopListening(): void;
    private onSoundPacket;
}
//# sourceMappingURL=AudioPlayer.d.ts.map