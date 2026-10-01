import { z } from "zod";
export declare const partyCodeSchema: z.ZodString;
export declare const createPartySchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    episodeId: z.ZodOptional<z.ZodString>;
    hostControlsOnly: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export declare const joinPartySchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export type JoinPartyInput = z.infer<typeof joinPartySchema>;
export declare const partyControlSchema: z.ZodObject<{
    code: z.ZodString;
    action: z.ZodEnum<{
        play: "play";
        pause: "pause";
        seek: "seek";
    }>;
    positionSeconds: z.ZodNumber;
}, z.core.$strip>;
export type PartyControlInput = z.infer<typeof partyControlSchema>;
export declare const partyChatSchema: z.ZodObject<{
    code: z.ZodString;
    body: z.ZodString;
    atSeconds: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PartyChatInput = z.infer<typeof partyChatSchema>;
export declare const REACTION_EMOJI: readonly ["😂", "😮", "😍", "😱", "👏", "🔥", "💀", "❤️"];
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];
export declare const partyReactionSchema: z.ZodObject<{
    code: z.ZodString;
    emoji: z.ZodEnum<{
        "\uD83D\uDE02": "😂";
        "\uD83D\uDE2E": "😮";
        "\uD83D\uDE0D": "😍";
        "\uD83D\uDE31": "😱";
        "\uD83D\uDC4F": "👏";
        "\uD83D\uDD25": "🔥";
        "\uD83D\uDC80": "💀";
        "\u2764\uFE0F": "❤️";
    }>;
    atSeconds: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PartyReactionInput = z.infer<typeof partyReactionSchema>;
export interface PartyMemberDTO {
    profileId: string;
    name: string;
    avatarKey: string;
    isHost: boolean;
}
export interface PartyStateDTO {
    code: string;
    mediaType: "movie" | "tv";
    mediaId: string;
    episodeId: string | null;
    title: string;
    subtitle: string | null;
    positionSeconds: number;
    isPlaying: boolean;
    lastSyncAt: string;
    hostControlsOnly: boolean;
    hostProfileId: string;
    members: PartyMemberDTO[];
    isHost: boolean;
}
export interface PartyMessageDTO {
    id: string;
    profileId: string;
    profileName: string;
    kind: "chat" | "reaction" | "system";
    body: string;
    atSeconds: number;
    createdAt: string;
}
export interface NotificationDTO {
    id: string;
    kind: "follow" | "party_invite" | "new_content" | "review_like" | "system";
    title: string;
    body: string;
    href: string | null;
    readAt: string | null;
    createdAt: string;
}
export declare const SOCKET_EVENTS: {
    readonly partyJoin: "party:join";
    readonly partyLeave: "party:leave";
    readonly partyControl: "party:control";
    readonly partyChat: "party:chat";
    readonly partyReaction: "party:reaction";
    readonly partyState: "party:state";
    readonly partySync: "party:sync";
    readonly partyMessage: "party:message";
    readonly partyMembers: "party:members";
    readonly partyEnded: "party:ended";
    readonly partyError: "party:error";
    readonly notification: "notification:new";
    readonly presence: "presence:update";
};
export interface PartySyncPayload {
    action: "play" | "pause" | "seek";
    positionSeconds: number;
    atServerTime: string;
    byProfileId: string;
}
//# sourceMappingURL=realtime.d.ts.map