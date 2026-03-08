'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import MovieCard from '@/components/MovieCard';
import { api } from '@/lib/api';
import type { Room, Member, Movie } from '@/types';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const roomId = Number(id);

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [matches, setMatches] = useState<Movie[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');

  const loadRoom = useCallback(async () => {
    const [r, m] = await Promise.all([api.rooms.get(roomId), api.rooms.members(roomId)]);
    setRoom(r as Room);
    setMembers(m as Member[]);
  }, [roomId]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    loadRoom();
    api.movies.list().then((data) => setMovies(data as Movie[]));
  }, [router, loadRoom]);

  useEffect(() => {
    if (room?.status === 'swiping') {
      api.movies.matches(roomId).then((data) => setMatches(data as Movie[])).catch(() => {});
    }
  }, [room?.status, roomId, index]);

  async function handleSwipe(direction: 'like' | 'dislike') {
    const movie = movies[index];
    if (!movie) return;
    try {
      await api.movies.swipe(roomId, movie.id, direction);
      setIndex((i) => i + 1);
      const updated = await api.movies.matches(roomId);
      setMatches(updated as Movie[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to swipe');
    }
  }

  async function startSwiping() {
    try {
      const updated = await api.rooms.updateStatus(roomId, 'swiping');
      setRoom(updated as Room);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  const remaining = movies.slice(index, index + 3);
  const done = index >= movies.length;

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-neutral-500 hover:text-white text-sm transition">
          Back
        </button>
        {room && (
          <div className="ml-auto text-right">
            <p className="font-semibold">{room.name}</p>
            <p className="text-xs font-mono text-neutral-500">{room.code}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {members.map((m) => (
          <span key={m.id} className="text-xs bg-neutral-800 px-2.5 py-1 rounded-full text-neutral-300">
            {m.username}
          </span>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {room?.status === 'waiting' && (
        <div className="text-center py-12">
          <p className="text-neutral-400 mb-6">Waiting for friends to join...</p>
          <button
            onClick={startSwiping}
            className="bg-brand hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            Start swiping
          </button>
        </div>
      )}

      {room?.status === 'swiping' && (
        <>
          <div className="relative w-full" style={{ height: '420px' }}>
            <AnimatePresence>
              {remaining.length > 0 && !done ? (
                remaining.map((movie, i) => (
                  <motion.div
                    key={movie.id}
                    className="absolute inset-0"
                    style={{ zIndex: remaining.length - i, scale: 1 - i * 0.04, y: i * 8 }}
                  >
                    <MovieCard
                      movie={movie}
                      onSwipe={handleSwipe}
                      isTop={i === 0}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full text-neutral-500"
                >
                  You&apos;ve swiped all movies!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!done && (
            <div className="flex justify-center gap-6 mt-6">
              <button
                onClick={() => handleSwipe('dislike')}
                className="w-14 h-14 rounded-full bg-neutral-800 hover:bg-red-900 border border-neutral-700 flex items-center justify-center text-2xl transition"
              >
                X
              </button>
              <button
                onClick={() => handleSwipe('like')}
                className="w-14 h-14 rounded-full bg-neutral-800 hover:bg-green-900 border border-neutral-700 flex items-center justify-center text-2xl transition"
              >
                +
              </button>
            </div>
          )}

          {matches.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Matches ({matches.length})
              </h3>
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-green-950 border border-green-900 rounded-xl px-4 py-3">
                    <span className="text-green-400 text-lg font-bold">v</span>
                    <div>
                      <p className="font-medium text-sm">{m.title}</p>
                      <p className="text-xs text-neutral-400">{m.year} · {m.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
