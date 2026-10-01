"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortOrderSchema = exports.paginationSchema = exports.maturityRatingSchema = exports.genreSchema = exports.mediaTypeSchema = exports.slugSchema = exports.objectIdSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.objectIdSchema = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");
exports.slugSchema = zod_1.z
    .string()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a lowercase hyphenated slug");
exports.mediaTypeSchema = zod_1.z.enum(constants_1.MEDIA_TYPES);
exports.genreSchema = zod_1.z.enum(constants_1.GENRES);
exports.maturityRatingSchema = zod_1.z.enum(constants_1.MATURITY_RATINGS);
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(constants_1.PAGINATION.maxLimit)
        .default(constants_1.PAGINATION.defaultLimit),
});
exports.sortOrderSchema = zod_1.z.enum(["asc", "desc"]).default("desc");
//# sourceMappingURL=common.js.map