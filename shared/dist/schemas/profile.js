"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectProfileSchema = exports.setProfilePinSchema = exports.updateProfileSchema = exports.createProfileSchema = exports.notificationPreferencesSchema = exports.playbackPreferencesSchema = exports.pinSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const common_1 = require("./common");
const languageCodes = constants_1.LANGUAGES.map((l) => l.code);
exports.pinSchema = zod_1.z
    .string()
    .regex(new RegExp(`^\\d{${constants_1.PROFILE_PIN_LENGTH}}$`), `PIN must be exactly ${constants_1.PROFILE_PIN_LENGTH} digits`);
exports.playbackPreferencesSchema = zod_1.z.object({
    autoplayNextEpisode: zod_1.z.boolean().default(true),
    autoplayPreviews: zod_1.z.boolean().default(true),
    defaultQuality: zod_1.z.enum(["auto", "1080p", "720p", "480p"]).default("auto"),
    subtitleLanguage: zod_1.z.enum(languageCodes).nullable().default(null),
    subtitlesEnabled: zod_1.z.boolean().default(false),
    reducedMotion: zod_1.z.boolean().default(false),
});
exports.notificationPreferencesSchema = zod_1.z.object({
    newContent: zod_1.z.boolean().default(true),
    partyInvites: zod_1.z.boolean().default(true),
    followActivity: zod_1.z.boolean().default(true),
    reviewLikes: zod_1.z.boolean().default(true),
});
exports.createProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Profile name is required").max(30),
    avatarKey: zod_1.z.string().trim().max(120).optional(),
    isKids: zod_1.z.boolean().default(false),
    language: zod_1.z.enum(languageCodes).default("en"),
    maturityLimit: zod_1.z.enum(constants_1.MATURITY_RATINGS).default("TV-MA"),
    pin: exports.pinSchema.optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(30).optional(),
    avatarKey: zod_1.z.string().trim().max(120).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    isKids: zod_1.z.boolean().optional(),
    language: zod_1.z.enum(languageCodes).optional(),
    maturityLimit: zod_1.z.enum(constants_1.MATURITY_RATINGS).optional(),
    playback: exports.playbackPreferencesSchema.partial().optional(),
    notifications: exports.notificationPreferencesSchema.partial().optional(),
});
exports.setProfilePinSchema = zod_1.z.object({
    pin: exports.pinSchema.nullable(),
    currentPin: exports.pinSchema.optional(),
});
exports.selectProfileSchema = zod_1.z.object({
    profileId: common_1.objectIdSchema,
    pin: exports.pinSchema.optional(),
});
//# sourceMappingURL=profile.js.map