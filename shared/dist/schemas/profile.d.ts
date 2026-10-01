import { z } from "zod";
export declare const pinSchema: z.ZodString;
export declare const playbackPreferencesSchema: z.ZodObject<{
    autoplayNextEpisode: z.ZodDefault<z.ZodBoolean>;
    autoplayPreviews: z.ZodDefault<z.ZodBoolean>;
    defaultQuality: z.ZodDefault<z.ZodEnum<{
        auto: "auto";
        "1080p": "1080p";
        "720p": "720p";
        "480p": "480p";
    }>>;
    subtitleLanguage: z.ZodDefault<z.ZodNullable<z.ZodEnum<{
        en: "en";
        es: "es";
        fr: "fr";
        de: "de";
        hi: "hi";
        ja: "ja";
        ko: "ko";
        zh: "zh";
        ru: "ru";
        it: "it";
    }>>>;
    subtitlesEnabled: z.ZodDefault<z.ZodBoolean>;
    reducedMotion: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type PlaybackPreferences = z.infer<typeof playbackPreferencesSchema>;
export declare const notificationPreferencesSchema: z.ZodObject<{
    newContent: z.ZodDefault<z.ZodBoolean>;
    partyInvites: z.ZodDefault<z.ZodBoolean>;
    followActivity: z.ZodDefault<z.ZodBoolean>;
    reviewLikes: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export declare const createProfileSchema: z.ZodObject<{
    name: z.ZodString;
    avatarKey: z.ZodOptional<z.ZodString>;
    isKids: z.ZodDefault<z.ZodBoolean>;
    language: z.ZodDefault<z.ZodEnum<{
        en: "en";
        es: "es";
        fr: "fr";
        de: "de";
        hi: "hi";
        ja: "ja";
        ko: "ko";
        zh: "zh";
        ru: "ru";
        it: "it";
    }>>;
    maturityLimit: z.ZodDefault<z.ZodEnum<{
        G: "G";
        PG: "PG";
        "PG-13": "PG-13";
        R: "R";
        "NC-17": "NC-17";
        "TV-Y": "TV-Y";
        "TV-G": "TV-G";
        "TV-PG": "TV-PG";
        "TV-14": "TV-14";
        "TV-MA": "TV-MA";
    }>>;
    pin: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatarKey: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    isKids: z.ZodOptional<z.ZodBoolean>;
    language: z.ZodOptional<z.ZodEnum<{
        en: "en";
        es: "es";
        fr: "fr";
        de: "de";
        hi: "hi";
        ja: "ja";
        ko: "ko";
        zh: "zh";
        ru: "ru";
        it: "it";
    }>>;
    maturityLimit: z.ZodOptional<z.ZodEnum<{
        G: "G";
        PG: "PG";
        "PG-13": "PG-13";
        R: "R";
        "NC-17": "NC-17";
        "TV-Y": "TV-Y";
        "TV-G": "TV-G";
        "TV-PG": "TV-PG";
        "TV-14": "TV-14";
        "TV-MA": "TV-MA";
    }>>;
    playback: z.ZodOptional<z.ZodObject<{
        autoplayNextEpisode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        autoplayPreviews: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        defaultQuality: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            auto: "auto";
            "1080p": "1080p";
            "720p": "720p";
            "480p": "480p";
        }>>>;
        subtitleLanguage: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<{
            en: "en";
            es: "es";
            fr: "fr";
            de: "de";
            hi: "hi";
            ja: "ja";
            ko: "ko";
            zh: "zh";
            ru: "ru";
            it: "it";
        }>>>>;
        subtitlesEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        reducedMotion: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    notifications: z.ZodOptional<z.ZodObject<{
        newContent: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        partyInvites: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        followActivity: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        reviewLikes: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const setProfilePinSchema: z.ZodObject<{
    pin: z.ZodNullable<z.ZodString>;
    currentPin: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SetProfilePinInput = z.infer<typeof setProfilePinSchema>;
export declare const selectProfileSchema: z.ZodObject<{
    profileId: z.ZodString;
    pin: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SelectProfileInput = z.infer<typeof selectProfileSchema>;
//# sourceMappingURL=profile.d.ts.map