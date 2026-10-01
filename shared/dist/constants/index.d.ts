export declare const USER_ROLES: readonly ["user", "admin"];
export type UserRole = (typeof USER_ROLES)[number];
export declare const MEDIA_TYPES: readonly ["movie", "tv"];
export type MediaType = (typeof MEDIA_TYPES)[number];
export declare const MAX_PROFILES_PER_ACCOUNT = 5;
export declare const PROFILE_PIN_LENGTH = 4;
export declare const MATURITY_RATINGS: readonly ["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-G", "TV-PG", "TV-14", "TV-MA"];
export type MaturityRating = (typeof MATURITY_RATINGS)[number];
export declare const KIDS_ALLOWED_RATINGS: readonly MaturityRating[];
export declare const GENRES: readonly ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"];
export type Genre = (typeof GENRES)[number];
export declare const LANGUAGES: readonly [{
    readonly code: "en";
    readonly label: "English";
}, {
    readonly code: "es";
    readonly label: "Spanish";
}, {
    readonly code: "fr";
    readonly label: "French";
}, {
    readonly code: "de";
    readonly label: "German";
}, {
    readonly code: "hi";
    readonly label: "Hindi";
}, {
    readonly code: "ja";
    readonly label: "Japanese";
}, {
    readonly code: "ko";
    readonly label: "Korean";
}, {
    readonly code: "zh";
    readonly label: "Chinese";
}, {
    readonly code: "ru";
    readonly label: "Russian";
}, {
    readonly code: "it";
    readonly label: "Italian";
}];
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export declare const COMPLETION_THRESHOLD = 0.9;
export declare const RESUME_MIN_THRESHOLD = 0.01;
export declare const PAGINATION: {
    readonly defaultLimit: 20;
    readonly maxLimit: 100;
};
export declare const PASSWORD_RULES: {
    readonly minLength: 10;
    readonly maxLength: 128;
};
export declare const TOKEN_TTL: {
    readonly accessSeconds: number;
    readonly refreshSeconds: number;
    readonly emailVerificationSeconds: number;
    readonly passwordResetSeconds: number;
};
export declare const COOKIE_NAMES: {
    readonly refreshToken: "kinora_rt";
    readonly activeProfile: "kinora_profile";
};
//# sourceMappingURL=index.d.ts.map