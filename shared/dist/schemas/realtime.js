"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = exports.partyReactionSchema = exports.REACTION_EMOJI = exports.partyChatSchema = exports.partyControlSchema = exports.joinPartySchema = exports.createPartySchema = exports.partyCodeSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.partyCodeSchema = zod_1.z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Party codes are 6 letters or digits");
exports.createPartySchema = zod_1.z
    .object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    episodeId: common_1.objectIdSchema.optional(),
    hostControlsOnly: zod_1.z.boolean().default(true),
})
    .refine((v) => (v.mediaType === "tv" ? Boolean(v.episodeId) : true), {
    message: "episodeId is required for a TV watch party",
    path: ["episodeId"],
});
exports.joinPartySchema = zod_1.z.object({ code: exports.partyCodeSchema });
exports.partyControlSchema = zod_1.z.object({
    code: exports.partyCodeSchema,
    action: zod_1.z.enum(["play", "pause", "seek"]),
    positionSeconds: zod_1.z.number().min(0).max(86_400),
});
exports.partyChatSchema = zod_1.z.object({
    code: exports.partyCodeSchema,
    body: zod_1.z.string().trim().min(1, "Say something").max(500),
    atSeconds: zod_1.z.number().min(0).default(0),
});
exports.REACTION_EMOJI = [
    "😂",
    "😮",
    "😍",
    "😱",
    "👏",
    "🔥",
    "💀",
    "❤️",
];
exports.partyReactionSchema = zod_1.z.object({
    code: exports.partyCodeSchema,
    emoji: zod_1.z.enum(exports.REACTION_EMOJI),
    atSeconds: zod_1.z.number().min(0).default(0),
});
exports.SOCKET_EVENTS = {
    partyJoin: "party:join",
    partyLeave: "party:leave",
    partyControl: "party:control",
    partyChat: "party:chat",
    partyReaction: "party:reaction",
    partyState: "party:state",
    partySync: "party:sync",
    partyMessage: "party:message",
    partyMembers: "party:members",
    partyEnded: "party:ended",
    partyError: "party:error",
    notification: "notification:new",
    presence: "presence:update",
};
//# sourceMappingURL=realtime.js.map