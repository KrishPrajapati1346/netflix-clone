import { z } from "zod";
import { mediaTypeSchema, objectIdSchema } from "./common";

export const partyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Party codes are 6 letters or digits");

export const createPartySchema = z
  .object({
    mediaType: mediaTypeSchema,
    mediaId: objectIdSchema,
    episodeId: objectIdSchema.optional(),
    hostControlsOnly: z.boolean().default(true),
  })
  .refine((v) => (v.mediaType === "tv" ? Boolean(v.episodeId) : true), {
    message: "episodeId is required for a TV watch party",
    path: ["episodeId"],
  });
export type CreatePartyInput = z.infer<typeof createPartySchema>;

export const joinPartySchema = z.object({ code: partyCodeSchema });
export type JoinPartyInput = z.infer<typeof joinPartySchema>;

export const partyControlSchema = z.object({
  code: partyCodeSchema,
  action: z.enum(["play", "pause", "seek"]),
  positionSeconds: z.number().min(0).max(86_400),
});
export type PartyControlInput = z.infer<typeof partyControlSchema>;

export const partyChatSchema = z.object({
  code: partyCodeSchema,
  body: z.string().trim().min(1, "Say something").max(500),
  atSeconds: z.number().min(0).default(0),
});
export type PartyChatInput = z.infer<typeof partyChatSchema>;

export const REACTION_EMOJI = [
  "😂",
  "😮",
  "😍",
  "😱",
  "👏",
  "🔥",
  "💀",
  "❤️",
] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export const partyReactionSchema = z.object({
  code: partyCodeSchema,
  emoji: z.enum(REACTION_EMOJI),
  atSeconds: z.number().min(0).default(0),
});
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

export const SOCKET_EVENTS = {
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
} as const;

export interface PartySyncPayload {
  action: "play" | "pause" | "seek";
  positionSeconds: number;
  atServerTime: string;
  byProfileId: string;
}
