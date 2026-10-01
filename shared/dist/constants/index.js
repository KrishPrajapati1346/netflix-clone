"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_NAMES = exports.TOKEN_TTL = exports.PASSWORD_RULES = exports.PAGINATION = exports.RESUME_MIN_THRESHOLD = exports.COMPLETION_THRESHOLD = exports.LANGUAGES = exports.GENRES = exports.KIDS_ALLOWED_RATINGS = exports.MATURITY_RATINGS = exports.PROFILE_PIN_LENGTH = exports.MAX_PROFILES_PER_ACCOUNT = exports.MEDIA_TYPES = exports.USER_ROLES = void 0;
exports.USER_ROLES = ["user", "admin"];
exports.MEDIA_TYPES = ["movie", "tv"];
exports.MAX_PROFILES_PER_ACCOUNT = 5;
exports.PROFILE_PIN_LENGTH = 4;
exports.MATURITY_RATINGS = [
    "G",
    "PG",
    "PG-13",
    "R",
    "NC-17",
    "TV-Y",
    "TV-G",
    "TV-PG",
    "TV-14",
    "TV-MA",
];
exports.KIDS_ALLOWED_RATINGS = [
    "G",
    "PG",
    "TV-Y",
    "TV-G",
    "TV-PG",
];
exports.GENRES = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Music",
    "Mystery",
    "Romance",
    "Science Fiction",
    "Thriller",
    "War",
    "Western",
];
exports.LANGUAGES = [
    { code: "en", label: "English" },
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "de", label: "German" },
    { code: "hi", label: "Hindi" },
    { code: "ja", label: "Japanese" },
    { code: "ko", label: "Korean" },
    { code: "zh", label: "Chinese" },
    { code: "ru", label: "Russian" },
    { code: "it", label: "Italian" },
];
exports.COMPLETION_THRESHOLD = 0.9;
exports.RESUME_MIN_THRESHOLD = 0.01;
exports.PAGINATION = {
    defaultLimit: 20,
    maxLimit: 100,
};
exports.PASSWORD_RULES = {
    minLength: 10,
    maxLength: 128,
};
exports.TOKEN_TTL = {
    accessSeconds: 15 * 60,
    refreshSeconds: 30 * 24 * 60 * 60,
    emailVerificationSeconds: 24 * 60 * 60,
    passwordResetSeconds: 60 * 60,
};
exports.COOKIE_NAMES = {
    refreshToken: "kinora_rt",
    activeProfile: "kinora_profile",
};
//# sourceMappingURL=index.js.map