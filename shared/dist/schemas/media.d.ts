import { z } from "zod";
export declare const castMemberSchema: z.ZodObject<{
    name: z.ZodString;
    character: z.ZodOptional<z.ZodString>;
    profileUrl: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CastMember = z.infer<typeof castMemberSchema>;
/** One rendition of a playable asset. `auto` picks the HLS master playlist. */
export declare const videoSourceSchema: z.ZodObject<{
    label: z.ZodEnum<{
        auto: "auto";
        "1080p": "1080p";
        "720p": "720p";
        "480p": "480p";
    }>;
    url: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        hls: "hls";
        mp4: "mp4";
    }>>;
}, z.core.$strip>;
export type VideoSource = z.infer<typeof videoSourceSchema>;
export declare const subtitleTrackSchema: z.ZodObject<{
    language: z.ZodEnum<{
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
    }>;
    label: z.ZodString;
    url: z.ZodString;
    isDefault: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type SubtitleTrack = z.infer<typeof subtitleTrackSchema>;
export declare const chapterSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        intro: "intro";
        recap: "recap";
        credits: "credits";
    }>;
    startSeconds: z.ZodNumber;
    endSeconds: z.ZodNumber;
}, z.core.$strip>;
export type Chapter = z.infer<typeof chapterSchema>;
export declare const createMovieSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    overview: z.ZodDefault<z.ZodString>;
    tagline: z.ZodOptional<z.ZodString>;
    genres: z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>;
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
    maturityRating: z.ZodDefault<z.ZodEnum<{
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
    releaseDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    posterUrl: z.ZodOptional<z.ZodString>;
    backdropUrl: z.ZodOptional<z.ZodString>;
    trailerUrl: z.ZodOptional<z.ZodString>;
    cast: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        character: z.ZodOptional<z.ZodString>;
        profileUrl: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    directors: z.ZodDefault<z.ZodArray<z.ZodString>>;
    keywords: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    isPublished: z.ZodDefault<z.ZodBoolean>;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    runtimeMinutes: z.ZodNumber;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            auto: "auto";
            "1080p": "1080p";
            "720p": "720p";
            "480p": "480p";
        }>;
        url: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<{
            hls: "hls";
            mp4: "mp4";
        }>>;
    }, z.core.$strip>>>;
    subtitles: z.ZodDefault<z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<{
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
        }>;
        label: z.ZodString;
        url: z.ZodString;
        isDefault: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    chapters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            intro: "intro";
            recap: "recap";
            credits: "credits";
        }>;
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export declare const updateMovieSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    overview: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tagline: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    genres: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>>;
    language: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
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
    maturityRating: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
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
    }>>>;
    releaseDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    posterUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    backdropUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    trailerUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    cast: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        character: z.ZodOptional<z.ZodString>;
        profileUrl: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>>;
    directors: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    keywords: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    tmdbId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isPublished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    runtimeMinutes: z.ZodOptional<z.ZodNumber>;
    sources: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            auto: "auto";
            "1080p": "1080p";
            "720p": "720p";
            "480p": "480p";
        }>;
        url: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<{
            hls: "hls";
            mp4: "mp4";
        }>>;
    }, z.core.$strip>>>>;
    subtitles: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<{
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
        }>;
        label: z.ZodString;
        url: z.ZodString;
        isDefault: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>>;
    chapters: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            intro: "intro";
            recap: "recap";
            credits: "credits";
        }>;
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export declare const createShowSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    overview: z.ZodDefault<z.ZodString>;
    tagline: z.ZodOptional<z.ZodString>;
    genres: z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>;
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
    maturityRating: z.ZodDefault<z.ZodEnum<{
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
    releaseDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    posterUrl: z.ZodOptional<z.ZodString>;
    backdropUrl: z.ZodOptional<z.ZodString>;
    trailerUrl: z.ZodOptional<z.ZodString>;
    cast: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        character: z.ZodOptional<z.ZodString>;
        profileUrl: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    directors: z.ZodDefault<z.ZodArray<z.ZodString>>;
    keywords: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    isPublished: z.ZodDefault<z.ZodBoolean>;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    firstAirDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    lastAirDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        returning: "returning";
        ended: "ended";
        canceled: "canceled";
        in_production: "in_production";
    }>>;
}, z.core.$strip>;
export type CreateShowInput = z.infer<typeof createShowSchema>;
export declare const updateShowSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    overview: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tagline: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    genres: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>>;
    language: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
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
    maturityRating: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
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
    }>>>;
    releaseDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    posterUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    backdropUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    trailerUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    cast: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        character: z.ZodOptional<z.ZodString>;
        profileUrl: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>>;
    directors: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    keywords: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    tmdbId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isPublished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    firstAirDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    lastAirDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        returning: "returning";
        ended: "ended";
        canceled: "canceled";
        in_production: "in_production";
    }>>>;
}, z.core.$strip>;
export type UpdateShowInput = z.infer<typeof updateShowSchema>;
export declare const createSeasonSchema: z.ZodObject<{
    showId: z.ZodString;
    seasonNumber: z.ZodNumber;
    name: z.ZodString;
    overview: z.ZodDefault<z.ZodString>;
    posterUrl: z.ZodOptional<z.ZodString>;
    airDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
}, z.core.$strip>;
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export declare const updateSeasonSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    posterUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    airDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
export declare const createEpisodeSchema: z.ZodObject<{
    showId: z.ZodString;
    seasonId: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    title: z.ZodString;
    overview: z.ZodDefault<z.ZodString>;
    stillUrl: z.ZodOptional<z.ZodString>;
    runtimeMinutes: z.ZodNumber;
    airDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            auto: "auto";
            "1080p": "1080p";
            "720p": "720p";
            "480p": "480p";
        }>;
        url: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<{
            hls: "hls";
            mp4: "mp4";
        }>>;
    }, z.core.$strip>>>;
    subtitles: z.ZodDefault<z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<{
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
        }>;
        label: z.ZodString;
        url: z.ZodString;
        isDefault: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    chapters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            intro: "intro";
            recap: "recap";
            credits: "credits";
        }>;
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
    }, z.core.$strip>>>;
    isPublished: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
export declare const updateEpisodeSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    isPublished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    runtimeMinutes: z.ZodOptional<z.ZodNumber>;
    sources: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            auto: "auto";
            "1080p": "1080p";
            "720p": "720p";
            "480p": "480p";
        }>;
        url: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<{
            hls: "hls";
            mp4: "mp4";
        }>>;
    }, z.core.$strip>>>>;
    subtitles: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<{
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
        }>;
        label: z.ZodString;
        url: z.ZodString;
        isDefault: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>>;
    chapters: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            intro: "intro";
            recap: "recap";
            credits: "credits";
        }>;
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
    }, z.core.$strip>>>>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    airDate: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    stillUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>;
export declare const catalogSortSchema: z.ZodDefault<z.ZodEnum<{
    title: "title";
    releaseDate: "releaseDate";
    popularity: "popularity";
    rating: "rating";
    runtime: "runtime";
    newest: "newest";
}>>;
export declare const catalogQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    type: z.ZodOptional<z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>>;
    genre: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>>, unknown>;
    language: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
    }>>>, unknown>;
    rating: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
    }>>>, unknown>;
    yearFrom: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    yearTo: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    runtimeMin: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    runtimeMax: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    minScore: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sort: z.ZodDefault<z.ZodEnum<{
        title: "title";
        releaseDate: "releaseDate";
        popularity: "popularity";
        rating: "rating";
        runtime: "runtime";
        newest: "newest";
    }>>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    q: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export declare const searchQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    type: z.ZodOptional<z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>>;
    genre: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Action: "Action";
        Adventure: "Adventure";
        Animation: "Animation";
        Comedy: "Comedy";
        Crime: "Crime";
        Documentary: "Documentary";
        Drama: "Drama";
        Family: "Family";
        Fantasy: "Fantasy";
        History: "History";
        Horror: "Horror";
        Music: "Music";
        Mystery: "Mystery";
        Romance: "Romance";
        "Science Fiction": "Science Fiction";
        Thriller: "Thriller";
        War: "War";
        Western: "Western";
    }>>>, unknown>;
    language: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
    }>>>, unknown>;
    rating: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
    }>>>, unknown>;
    yearFrom: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    yearTo: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    runtimeMin: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    runtimeMax: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    minScore: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sort: z.ZodDefault<z.ZodEnum<{
        title: "title";
        releaseDate: "releaseDate";
        popularity: "popularity";
        rating: "rating";
        runtime: "runtime";
        newest: "newest";
    }>>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    q: z.ZodString;
}, z.core.$strip>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export declare const autocompleteQuerySchema: z.ZodObject<{
    q: z.ZodString;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
//# sourceMappingURL=media.d.ts.map