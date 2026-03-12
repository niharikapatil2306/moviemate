import { Response } from 'express';
import * as swipeService from '../services/swipe.service';
import * as recommendationService from '../services/recommendation.service';
import { AuthRequest } from '../middleware/auth';

export async function getMovies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : undefined;
    const movies = await swipeService.getMovies(roomId, req.userId);
    res.json(movies);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch movies';
    res.status(500).json({ message });
  }
}

export async function swipe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { movieId, direction } = req.body;
    const result = await swipeService.swipe(req.userId!, Number(req.params.id), movieId, direction);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to swipe';
    res.status(400).json({ message });
  }
}

export async function getMatches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const matches = await swipeService.getMatches(Number(req.params.id), req.userId!);
    res.json(matches);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get matches';
    res.status(400).json({ message });
  }
}

export async function setGenres(req: AuthRequest, res: Response): Promise<void> {
  try {
    await recommendationService.setRoomGenres(Number(req.params.id), req.userId!, req.body.genreIds);
    res.json({ message: 'Genres updated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to set genres';
    res.status(400).json({ message });
  }
}

export async function getGenres(req: AuthRequest, res: Response): Promise<void> {
  try {
    const genres = await recommendationService.getRoomGenres(Number(req.params.id));
    res.json(genres);
  } catch (err: unknown) {
    res.status(400).json({ message: 'Failed to get genres' });
  }
}
