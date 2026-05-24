"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = plugin;
const simple_voice_chat_1 = require("./simple_voice_chat");
function plugin(bot) {
    // @ts-ignore
    bot.simple_voice_chat = {};
    (0, simple_voice_chat_1.init)(bot);
    bot.simple_voice_chat.sendUDP = (payload) => {
        simple_voice_chat_1.SVC_OBJ.VoiceServer.send(payload);
    };
    bot.simple_voice_chat.sendPCM = (pcm, whispering = false) => {
        bot.simple_voice_chat.sendUDP(simple_voice_chat_1.SVC_OBJ.PacketManager.protoDef.createPacketBuffer("packet", {
            "id": "MicPacket",
            "data": {
                "data": pcm,
                "sequencenumber": process.hrtime.bigint(),
                "whispering": whispering
            }
        }));
    };
    bot.simple_voice_chat.joinGroup = (group, password = "") => {
        const pass = String(password);
        bot._client.write("custom_payload", { channel: "voicechat:set_group", data: simple_voice_chat_1.SVC_OBJ.PacketManager.createPacket("set_group", {
                "uuid": group,
                "password": pass.length > 0 ? pass : undefined
            }) });
    };
    bot.simple_voice_chat.joinGroupName = (groupname, password = "") => {
        for (const group of simple_voice_chat_1.SVC_Data.groups) {
            if (String(group[1].name) == groupname) {
                bot.simple_voice_chat.joinGroup(group[0], group[1].hasPassword ? password : "");
                return;
            }
        }
    };
    bot.simple_voice_chat.leaveGroup = () => {
        bot._client.write("custom_payload", { channel: "voicechat:leave_group", data: Buffer.from([]) });
    };
    bot.simple_voice_chat.createGroup = (name, password, type = "normal") => {
        const pass = password ? String(password) : "";
        bot._client.write("custom_payload", { channel: "voicechat:create_group", data: simple_voice_chat_1.SVC_OBJ.PacketManager.createPacket("create_group", {
                "name": name,
                "password": pass.length > 0 ? pass : undefined,
                "type": type
            }) });
    };
    bot.simple_voice_chat.listGroups = () => {
        const result = [];
        for (const [id, group] of simple_voice_chat_1.SVC_Data.groups) {
            result.push({
                id: id,
                name: group.name,
                hasPassword: group.hasPassword,
                persistent: group.persistent,
                hidden: group.hidden,
                type: group.type,
            });
        }
        return result;
    };
    bot.simple_voice_chat.getJoinedGroup = () => {
        var _a;
        return (_a = simple_voice_chat_1.SVC_Data.joinedGroup) !== null && _a !== void 0 ? _a : null;
    };
    bot.simple_voice_chat.compatibilityVersion = simple_voice_chat_1.SVC_Data.compatibilityVersion;
    bot.simple_voice_chat.protodef = simple_voice_chat_1.SVC_OBJ.PacketManager.protoDef;
    bot.simple_voice_chat.data = simple_voice_chat_1.SVC_Data;
    bot.simple_voice_chat.AudioPlayer = simple_voice_chat_1.SVC_OBJ.AudioPlayer;
}
//# sourceMappingURL=index.js.map