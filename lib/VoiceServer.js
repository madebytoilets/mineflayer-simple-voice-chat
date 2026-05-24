"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram = __importStar(require("dgram"));
const simple_voice_chat_1 = require("./simple_voice_chat");
class VoiceServer {
    constructor() {
        this.MAGIC_NUMBER = 255;
        this.udpSocket = dgram.createSocket('udp4');
        this.connected = false;
        this.authRetryTimer = null;
    }
    init(bot, data) {
        this.udpSocket.on("error", (err) => {
            bot.emit("error", new Error(`VoiceChat UDP error: ${err.message}`));
        });
        this.udpSocket.on("close", () => { console.log("UDP Connection closed"); });
        this.udpSocket.on("message", this.handler.bind(this));
        this.bot = bot;
        this.playerUUID = data.playerUUID;
        const parsed = this.parseAddress(data.voiceHost, bot._client.socket.remoteAddress, data.serverPort);
        this.host = parsed.host;
        this.port = parsed.port;
        this.secret = data.secret;
        simple_voice_chat_1.SVC_OBJ.PacketManager.secret = this.secret;
        const authPacket = simple_voice_chat_1.SVC_OBJ.PacketManager.createPacket("packet", {
            "id": "AuthenticatePacket",
            "data": {
                "playerUUID": this.playerUUID,
                "secret": this.secret
            }
        });
        const sendAuth = () => this.send(authPacket);
        sendAuth();
        this.authRetryTimer = setInterval(sendAuth, 1000);
    }
    cancelAuthRetry() {
        if (this.authRetryTimer) {
            clearInterval(this.authRetryTimer);
            this.authRetryTimer = null;
        }
    }
    close() {
        this.cancelAuthRetry();
        try {
            this.udpSocket.close();
        }
        catch (e) { }
    }
    parseAddress(voiceHost, serverIP, serverPort) {
        let host = serverIP;
        let port = serverPort;
        if (!voiceHost || voiceHost.length === 0) {
            return { host, port };
        }
        const onlyDigits = /^\d+$/;
        if (onlyDigits.test(voiceHost)) {
            const parsedPort = parseInt(voiceHost, 10);
            if (parsedPort > 0 && parsedPort <= 65535) {
                port = parsedPort;
            }
            return { host, port };
        }
        try {
            const uri = new URL("voicechat://" + voiceHost);
            if (uri.hostname) {
                host = uri.hostname;
            }
            if (uri.port) {
                port = parseInt(uri.port, 10);
            }
        }
        catch (e) {
            this.bot.emit("error", new Error(`Failed to parse voice host: ${voiceHost}`));
        }
        return { host, port };
    }
    handler(msg, _) {
        return __awaiter(this, void 0, void 0, function* () {
            const network_message = simple_voice_chat_1.SVC_OBJ.PacketManager.parsePacket("client_network_message", msg);
            if (network_message.data.magic_number != this.MAGIC_NUMBER) {
                return;
            }
            const payload = simple_voice_chat_1.SVC_OBJ.PacketManager.decrypt(network_message.data.payload);
            const packet = simple_voice_chat_1.SVC_OBJ.PacketManager.parsePacket("packet", payload);
            this.bot._client.emit(`SVC_${packet.data.id.replace("Packet", "")}`, (packet.data.data));
        });
    }
    send(payload) {
        const enc_payload = simple_voice_chat_1.SVC_OBJ.PacketManager.encrypt(payload);
        const network_message = simple_voice_chat_1.SVC_OBJ.PacketManager.createPacket("server_network_message", {
            "magic_number": this.MAGIC_NUMBER,
            "playerUUID": this.playerUUID,
            "payload": enc_payload
        });
        this.udpSocket.send(network_message, this.port, this.host);
    }
}
exports.default = VoiceServer;
//# sourceMappingURL=VoiceServer.js.map