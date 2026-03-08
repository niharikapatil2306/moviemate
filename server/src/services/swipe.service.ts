import pool from '../config/db';

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
}

interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  description: string;
  poster: string;
}

let cache: Movie[] | null = null;

async function fetchMovies(): Promise<Movie[]> {
  if (cache) return cache;

  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY is not set in .env');

  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      fetch(`${TMDB_BASE}/movie/popular?api_key=${key}&language=en-US&page=${page}`)
        .then((r) => r.json())
        .then((data) => data.results as TMDBMovie[])
    )
  );

  cache = pages
    .flat()
    .filter((m) => m.poster_path && m.overview)
    .map((m) => ({
      id: m.id,
      title: m.title,
      year: new Date(m.release_date).getFullYear(),
      genre: GENRE_MAP[m.genre_ids[0]] || 'Other',
      description: m.overview,
      poster: m.poster_path,
    }));

  return cache;
}

export async function getMovies(): Promise<Movie[]> {
  return fetchMovies();
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

  const movies = await fetchMovies();
  if (!movies.find((m) => m.id === movieId)) throw new Error('Movie not found');

  await pool.query(
    `INSERT INTO swipes (user_id, room_id, movie_id, direction)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, room_id, movie_id) DO UPDATE SET direction = $4`,
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
  const movies = await fetchMovies();
  return movies.filter((m) => matchedIds.includes(m.id));
}
