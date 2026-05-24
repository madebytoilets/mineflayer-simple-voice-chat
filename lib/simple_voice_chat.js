"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVC_OBJ = exports.SVC_Data = void 0;
exports.init = init;
//types
const PacketManager_1 = __importDefault(require("./PacketManager"));
const VoiceServer_1 = __importDefault(require("./VoiceServer"));
const AudioPlayer_1 = __importDefault(require("./AudioPlayer"));
class SVC_Data {
}
exports.SVC_Data = SVC_Data;
SVC_Data.joinedGroup = undefined;
SVC_Data.compatibilityVersion = 20;
const MC_TO_SVC = {
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
};
function resolveSVCVersion(mcVersion) {
    const norm = mcVersion.replace(/^.*?(\d+\.\d+(?:\.\d+)?).*$/, "$1");
    const exact = MC_TO_SVC[norm];
    if (exact)
        return exact;
    const major = norm.match(/^(\d+\.\d+)/);
    if (major) {
        for (const [key, value] of Object.entries(MC_TO_SVC)) {
            if (key.startsWith(major[1]))
                return value;
        }
    }
    return 20;
}
class SVC_OBJ {
}
exports.SVC_OBJ = SVC_OBJ;
SVC_OBJ.VoiceServer = new VoiceServer_1.default();
function init(bot) {
    //Init
    SVC_OBJ.PacketManager = new PacketManager_1.default();
    SVC_OBJ.PacketManager.init(bot);
    SVC_OBJ.AudioPlayer = new AudioPlayer_1.default();
    SVC_OBJ.AudioPlayer.init(bot);
    SVC_Data.groups = new Map();
    SVC_Data.players = new Map();
    bot.on("spawn", () => {
        const mcVersion = bot.version || "1.21";
        SVC_Data.compatibilityVersion = resolveSVCVersion(mcVersion);
        if (SVC_Data.compatibilityVersion !== 20) {
            console.error("\x1b[41m\x1b[97m");
            console.error(`  ⚠ MINEFLAYER-SIMPLE-VOICE-CHAT: Server is MC ${mcVersion} (SVC compat ${SVC_Data.compatibilityVersion})  `);
            console.error("  This library only supports SVC compatibility version 20 (MC 1.21.x).        ");
            console.error("  The voice chat connection will likely fail.                                 ");
            console.error("\x1b[0m");
            bot.emit("error", new Error(`Incompatible SVC version: server needs ${SVC_Data.compatibilityVersion}, library supports 20`));
        }
        bot._client.write("custom_payload", { channel: "voicechat:request_secret", data: SVC_OBJ.PacketManager.createPacket("request_secret", { "version": SVC_Data.compatibilityVersion }) });
    });
    //Message Channels
    bot._client.on("voicechat:secret", (packet) => {
        if (connectionCheckTimer) {
            clearInterval(connectionCheckTimer);
            connectionCheckTimer = null;
        }
        SVC_OBJ.VoiceServer.close();
        SVC_OBJ.VoiceServer = new VoiceServer_1.default();
        SVC_OBJ.VoiceServer.init(bot, packet);
    });
    bot._client.on("voicechat:player_state", (packet) => {
        if (SVC_Data.players.has(packet.player_state.uuid)) {
            SVC_Data.players.delete(packet.player_state.uuid);
        }
        if (packet.player_state.disconnected) {
            return;
        }
        SVC_Data.players.set(packet.player_state.uuid, packet.player_state);
    });
    bot._client.on("voicechat:player_states", (packet) => {
        SVC_Data.players = new Map();
        for (let player of packet.player_states) {
            if (player.disconnected) {
                continue;
            }
            SVC_Data.players.set(player.uuid, player);
        }
    });
    bot._client.on("voicechat:add_group", (packet) => {
        if (SVC_Data.groups.has(packet.group.id)) {
            SVC_Data.groups.delete(packet.group.id);
        }
        SVC_Data.groups.set(packet.group.id, packet.group);
    });
    bot._client.on("voicechat:remove_group", (packet) => {
        SVC_Data.groups.delete(packet.uuid);
    });
    bot._client.on("voicechat:joined_group", (packet) => {
        SVC_Data.joinedGroup = packet.uuid || undefined;
        bot.emit("voicechat_joined_group", { uuid: packet.uuid || undefined, wrong_password: packet.wrong_password });
    });
    //UDP Server
    let connectionCheckTimer = null;
    let authenticated = false;
    bot._client.on("SVC_AuthenticateAck", (data) => {
        if (authenticated)
            return;
        authenticated = true;
        SVC_OBJ.VoiceServer.cancelAuthRetry();
        const connCheckPkt = SVC_OBJ.PacketManager.createPacket("packet", {
            "id": "ConnectionCheckPacket",
            "data": {}
        });
        const sendConnCheck = () => SVC_OBJ.VoiceServer.send(connCheckPkt);
        sendConnCheck();
        connectionCheckTimer = setInterval(sendConnCheck, 1000);
    });
    bot._client.on("SVC_ConnectionCheckAck", (data) => {
        if (connectionCheckTimer) {
            clearInterval(connectionCheckTimer);
            connectionCheckTimer = null;
        }
        SVC_OBJ.VoiceServer.connected = true;
        bot.emit("voicechat_connected");
        bot._client.write("custom_payload", {
            channel: "voicechat:update_state",
            data: SVC_OBJ.PacketManager.createPacket("update_state", { disabled: false, disconnected: false })
        });
    });
    bot._client.on("SVC_Ping", (data) => {
        SVC_OBJ.VoiceServer.send(SVC_OBJ.PacketManager.createPacket("packet", {
            "id": "PingPacket",
            "data": {
                "id": data.id,
                "timestamp": data.timestamp
            }
        }));
    });
    bot._client.on("SVC_KeepAlive", (data) => {
        SVC_OBJ.VoiceServer.send(SVC_OBJ.PacketManager.createPacket("packet", {
            "id": "KeepAlivePacket",
            "data": {}
        }));
    });
    bot._client.on("SVC_PlayerSound", (data) => {
        var _a;
        bot.emit("voicechat_sound", {
            sender: data.sender,
            data: Buffer.from(data.data),
            sequencenumber: data.sequencenumber,
            category: data.category || undefined,
            whispering: ((_a = data.flags) === null || _a === void 0 ? void 0 : _a.whisper) === 1,
            distance: data.distance,
            location: data.location || undefined,
        });
    });
    bot._client.on("SVC_GroupSound", (data) => {
        bot.emit("voicechat_sound", {
            sender: data.sender,
            data: Buffer.from(data.data),
            sequencenumber: data.sequencenumber,
            category: data.category || undefined,
            whispering: false,
            distance: undefined,
            location: undefined,
        });
    });
    bot._client.on("SVC_LocationSound", (data) => {
        bot.emit("voicechat_sound", {
            sender: data.sender,
            data: Buffer.from(data.data),
            sequencenumber: data.sequencenumber,
            category: data.category || undefined,
            whispering: false,
            distance: data.distance,
            location: data.location || undefined,
        });
    });
}
//# sourceMappingURL=simple_voice_chat.js.map