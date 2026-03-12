import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as swipeController from '../controllers/swipe.controller';

const router = Router();

const swipeSchema = z.object({
  movieId: z.number().int().positive(),
  direction: z.enum(['like', 'dislike']),
});

const genreSchema = z.object({
  genreIds: z.array(z.number().int()).min(1),
});

router.use(authenticate);

router.get('/movies', swipeController.getMovies);
router.post('/rooms/:id/swipe', validate(swipeSchema), swipeController.swipe);
router.get('/rooms/:id/matches', swipeController.getMatches);
router.post('/rooms/:id/genres', validate(genreSchema), swipeController.setGenres);
router.get('/rooms/:id/genres', swipeController.getGenres);

export default router;
