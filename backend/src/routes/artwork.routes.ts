import { Router } from 'express';
import { env } from '../config/env';
import { generateArtwork } from '../services/artwork.service';
import { findTitleBySlug } from '../services/catalog.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param } from '../utils/http';

const router = Router();

/**
 * Generated placeholder artwork.
 *
 * Public and uncredentialed on purpose — these are `<img>` sources, and a
 * browser will not attach an Authorization header to one. Nothing sensitive is
 * exposed: the response is derived entirely from a slug that is already public.
 *
 * Cached hard because the output is a pure function of the slug. A year of
 * `immutable` is safe: change the title's artwork and its `posterUrl` is set
 * instead, so this route stops being consulted at all.
 */
router.get(
  '/:slug/:shape.svg',
  asyncHandler(async (req, res) => {
    const slug = param(req, 'slug');
    const shape = param(req, 'shape') === 'backdrop' ? 'backdrop' : 'poster';

    const resolved = await findTitleBySlug(slug);
    if (!resolved) throw ApiError.notFound('No artwork for that title', 'TITLE_NOT_FOUND');

    const doc = resolved.doc;
    const releaseDate = doc.releaseDate;

    // The poster is composed from the title's own metadata — genre drives the
    // palette and graphic field, and the billing block is real cast and crew.
    const svg = generateArtwork({
      slug,
      title: doc.title,
      shape,
      year: releaseDate ? new Date(releaseDate).getUTCFullYear() : null,
      genres: (doc.genres ?? []) as string[],
      directors: (doc.directors ?? []) as string[],
      cast: (doc.cast ?? []) as Array<{ name: string }>,
      maturityRating: doc.maturityRating,
    });

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    // Immutable in production, where the output really is fixed for a slug.
    // In development the generator itself is being edited, and a year-long
    // immutable cache would keep serving the previous drawing.
    res.setHeader(
      'Cache-Control',
      env.isProduction ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
    res.send(svg);
  }),
);

export const artworkRoutes = router;
