import pool from '../config/db';

// 18 TMDB genre IDs in fixed order for one-hot encoding
const GENRE_IDS = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37];

// Dims 0-17: genre multi-hot, dim 18: normalized popularity, dim 19: normalized vote average
export function computeVector(genreIds: number[], popularity: number, voteAverage: number): number[] {
  const genreVec = GENRE_IDS.map((id) => (genreIds.includes(id) ? 1 : 0));
  const popularityNorm = Math.min(Math.log10(popularity + 1) / 3, 1);
  const voteNorm = voteAverage / 10;
  return [...genreVec, popularityNorm, voteNorm];
}

export async function storeVector(movieId: number, vec: number[]): Promise<void> {
  const formatted = `[${vec.join(',')}]`;
  await pool.query(
    `INSERT INTO movie_vectors (movie_id, embedding)
     VALUES ($1, $2::vector)
     ON CONFLICT (movie_id) DO NOTHING`,
    [movieId, formatted]
  );
}

export async function getRecommended(roomId: number, userId: number, candidateIds: number[]): Promise<number[]> {
  if (candidateIds.length === 0) return [];

  // Get liked movie vectors for this user in this room
  const liked = await pool.query(
    `SELECT mv.embedding FROM movie_vectors mv
     JOIN swipes s ON s.movie_id = mv.movie_id
     WHERE s.user_id = $1 AND s.room_id = $2 AND s.direction = 'like'`,
    [userId, roomId]
  );

  // Not enough likes yet — return candidates in original order
  if (liked.rows.length === 0) return candidateIds;

  // Average liked vectors into a preference vector
  const dim = 20;
  const avg = new Array(dim).fill(0);
  for (const row of liked.rows) {
    const vec: number[] = row.embedding.slice(1, -1).split(',').map(Number);
    for (let i = 0; i < dim; i++) avg[i] += vec[i] / liked.rows.length;
  }
  const prefVec = `[${avg.join(',')}]`;

  // Rank candidate movies by cosine similarity to preference vector
  try {
    const placeholders = candidateIds.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `SELECT movie_id FROM movie_vectors
       WHERE movie_id IN (${placeholders})
       ORDER BY embedding <=> $1::vector ASC`,
      [prefVec, ...candidateIds]
    );
    const ranked = result.rows.map((r: { movie_id: number }) => r.movie_id);
    const unranked = candidateIds.filter((id) => !ranked.includes(id));
    return [...ranked, ...unranked];
  } catch {
    // pgvector not available — fall back to original order
    return candidateIds;
  }
}

export async function setRoomGenres(roomId: number, userId: number, genreIds: number[]): Promise<void> {
  const room = await pool.query('SELECT host_id, status FROM rooms WHERE id = $1', [roomId]);
  if (!room.rows[0]) throw new Error('Room not found');
  if (room.rows[0].host_id !== userId) throw new Error('Only the host can set genres');
  if (room.rows[0].status !== 'waiting') throw new Error('Genres can only be set before swiping starts');

  await pool.query('DELETE FROM room_genres WHERE room_id = $1', [roomId]);
  if (genreIds.length > 0) {
    const values = genreIds.map((_, i) => `($1, $${i + 2})`).join(',');
    await pool.query(`INSERT INTO room_genres (room_id, genre_id) VALUES ${values}`, [roomId, ...genreIds]);
  }
}

export async function getRoomGenres(roomId: number): Promise<number[]> {
  const result = await pool.query('SELECT genre_id FROM room_genres WHERE room_id = $1', [roomId]);
  return result.rows.map((r: { genre_id: number }) => r.genre_id);
}
