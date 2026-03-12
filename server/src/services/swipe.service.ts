import pool from '../config/db';
import { computeVector, storeVector, getRecommended, getRoomGenres } from './recommendation.service';

const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  poster_path: string;
  popularity: number;
  vote_average: number;
}

export interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  description: string;
  poster: string;
}

let cache: TMDBMovie[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchTMDB(): Promise<TMDBMovie[]> {
  if (cache && Date.now() < cacheExpiry) return cache;

  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY is not set in .env');

  const endpoints = [
    ...([1, 2, 3, 4, 5].map((p) => `${TMDB_BASE}/movie/popular?api_key=${key}&language=en-US&page=${p}`)),
    ...([1, 2, 3].map((p) => `${TMDB_BASE}/movie/top_rated?api_key=${key}&language=en-US&page=${p}`)),
    ...([1, 2, 3].map((p) => `${TMDB_BASE}/movie/now_playing?api_key=${key}&language=en-US&page=${p}`)),
    ...([1, 2, 3].map((p) => `${TMDB_BASE}/movie/upcoming?api_key=${key}&language=en-US&page=${p}`)),
  ];

  const pages = await Promise.all(
    endpoints.map((url) =>
      fetch(url)
        .then((r) => r.json())
        .then((data) => (data as { results: TMDBMovie[] }).results)
    )
  );

  const seen = new Set<number>();
  cache = pages.flat().filter((m) => {
    if (!m.poster_path || !m.overview || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  }).slice(0, 50);
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  // Store vectors for all movies (fire and forget)
  cache.forEach((m) => {
    const vec = computeVector(m.genre_ids, m.popularity, m.vote_average);
    storeVector(m.id, vec).catch(() => {});
  });

  return cache;
}

function toMovie(m: TMDBMovie): Movie {
  return {
    id: m.id,
    title: m.title,
    year: new Date(m.release_date).getFullYear(),
    genre: GENRE_MAP[m.genre_ids[0]] || 'Other',
    description: m.overview,
    poster: m.poster_path,
  };
}

export async function getMovies(roomId?: number, userId?: number): Promise<Movie[]> {
  const all = await fetchTMDB();

  let filtered = all;

  // Filter by room genres if set
  if (roomId) {
    const genreIds = await getRoomGenres(roomId);
    if (genreIds.length > 0) {
      filtered = all.filter((m) => m.genre_ids.some((g) => genreIds.includes(g)));
    }
  }

  // Filter out already-swiped movies for this user
  if (roomId && userId) {
    const swiped = await pool.query(
      'SELECT movie_id, direction FROM swipes WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );
    const swipedIds = new Set(swiped.rows.map((r: { movie_id: number }) => r.movie_id));

    // Unswiped genre-filtered movies
    let remaining = filtered.filter((m) => !swipedIds.has(m.id));

    // If genre-filtered pool exhausted, fall back to unswiped from full pool
    if (remaining.length === 0 && filtered.length < all.length) {
      remaining = all.filter((m) => !swipedIds.has(m.id));
    }

    filtered = remaining;
  }

  // Sort by vector similarity if user has liked movies
  if (roomId && userId) {
    const candidateIds = filtered.map((m) => m.id);
    const ranked = await getRecommended(roomId, userId, candidateIds);
    const movieMap = new Map(filtered.map((m) => [m.id, m]));
    filtered = ranked.map((id) => movieMap.get(id)!).filter(Boolean);
  }

  return filtered.map(toMovie);
}

export async function swipe(userId: number, roomId: number, movieId: number, direction: 'like' | 'dislike') {
  const member = await pool.query(
    'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if (!member.rows[0]) throw new Error('Not a member of this room');

  const room = await pool.query('SELECT status FROM rooms WHERE id = $1', [roomId]);
  if (!room.rows[0]) throw new Error('Room not found');
  if (room.rows[0].status !== 'swiping') throw new Error('Room is not in swiping mode');

  const all = await fetchTMDB();
  if (!all.find((m) => m.id === movieId)) throw new Error('Movie not found');

  await pool.query(
    `INSERT INTO swipes (user_id, room_id, movie_id, direction)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, room_id, movie_id) DO UPDATE SET direction = $4, created_at = NOW()`,
    [userId, roomId, movieId, direction]
  );

  return { movieId, direction };
}

export async function getMatches(roomId: number, userId: number) {
  const member = await pool.query(
    'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if (!member.rows[0]) throw new Error('Not a member of this room');

  const memberCount = await pool.query(
    'SELECT COUNT(*) as count FROM room_members WHERE room_id = $1',
    [roomId]
  );
  const total = parseInt(memberCount.rows[0].count);

  const result = await pool.query(
    `SELECT movie_id FROM swipes
     WHERE room_id = $1 AND direction = 'like'
     GROUP BY movie_id
     HAVING COUNT(*) = $2`,
    [roomId, total]
  );

  const matchedIds = result.rows.map((r: { movie_id: number }) => r.movie_id);
  const all = await fetchTMDB();
  return all.filter((m) => matchedIds.includes(m.id)).map(toMovie);
}
