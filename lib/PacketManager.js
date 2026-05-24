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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//import crypto from "crypto";
const protodef_1 = require("protodef");
const crypto = __importStar(require("crypto"));
const protocol_1 = __importDefault(require("./data/protocol"));
class PacketManager {
    constructor() {
        this.protoDef = new protodef_1.ProtoDef(false);
    }
    init(bot) {
        return __awaiter(this, void 0, void 0, function* () {
            this.bot = bot;
            this.protoDef.addProtocol(protocol_1.default, ["channels"]);
            this.protoDef.addProtocol(protocol_1.default, ["udp"]);
            this.protoDef.addTypes(protocol_1.default.types);
            this.bot.on("login", () => __awaiter(this, void 0, void 0, function* () {
                this.registerChannels(this.bot._client);
                this.registerTypes(this.bot._client);
            }));
        });
    }
    init_udp() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    registerChannels(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const types = this.protoDef.types;
            client.registerChannel("voicechat:secret", types.secret, true);
            client.registerChannel("voicechat:player_state", types.player_state, true);
            client.registerChannel("voicechat:player_states", types.player_states, true);
            client.registerChannel("voicechat:add_group", types.add_group, true);
            client.registerChannel("voicechat:remove_group", types.remove_group, true);
            client.registerChannel("voicechat:joined_group", types.joined_group, true);
        });
    }
    registerTypes(client) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [key, value] of Object.entries(this.protoDef.types)) {
                client.registerChannel(key, value);
            }
        });
    }
    parsePacket(packet_type, packet) {
        return this.protoDef.parsePacketBuffer(packet_type, packet);
    }
    createPacket(packet_type, packet) {
        return this.protoDef.createPacketBuffer(packet_type, packet);
    }
    encrypt(data) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-128-gcm', this.secret, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, encrypted, tag]);
    }
    decrypt(payloadArray) {
        const payload = Buffer.from(payloadArray);
        const iv = payload.subarray(0, 12);
        const tag = payload.subarray(payload.length - 16);
        const encryptedData = payload.subarray(12, payload.length - 16);
        const decipher = crypto.createDecipheriv('aes-128-gcm', this.secret, iv);
        decipher.setAuthTag(tag);
        const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decryptedData;
    }
}
exports.default = PacketManager;
//# sourceMappingURL=PacketManager.js.map