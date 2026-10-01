export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MEDIA_TYPES = ["movie", "tv"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MAX_PROFILES_PER_ACCOUNT = 5;

export const PROFILE_PIN_LENGTH = 4;

export const MATURITY_RATINGS = [
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
] as const;
export type MaturityRating = (typeof MATURITY_RATINGS)[number];

export const KIDS_ALLOWED_RATINGS: readonly MaturityRating[] = [
  "G",
  "PG",
  "TV-Y",
  "TV-G",
  "TV-PG",
];

export const GENRES = [
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
] as const;
export type Genre = (typeof GENRES)[number];

export const LANGUAGES = [
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
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const COMPLETION_THRESHOLD = 0.9;

export const RESUME_MIN_THRESHOLD = 0.01;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const PASSWORD_RULES = {
  minLength: 10,
  maxLength: 128,
} as const;

export const TOKEN_TTL = {
  accessSeconds: 15 * 60,
  refreshSeconds: 30 * 24 * 60 * 60,
  emailVerificationSeconds: 24 * 60 * 60,
  passwordResetSeconds: 60 * 60,
} as const;

export const COOKIE_NAMES = {
  refreshToken: "kinora_rt",
  activeProfile: "kinora_profile",
} as const;
